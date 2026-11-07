"""Run with Python 3.11+ and the pinned adapter requirements installed."""
import json
from pathlib import Path
import tempfile
import unittest
from shoalrun_reference import convert


class ConverterTests(unittest.TestCase):
    def test_static_only_and_deterministic(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            marker = root / "executed"
            (root / "sample.py").write_text(
                f'from pathlib import Path\nPath({str(marker)!r}).write_text("executed")\n'
                'raise RuntimeError("must not run")\n\n'
                'def greet(name: str = "reader") -> str:\n'
                '    """Greet a reader.\n\n    Args:\n        name: Reader name.\n\n    Returns:\n        Greeting text.\n    """\n'
                '    return "hello"\n\n'
                'def _private():\n    """Private marker."""\n', encoding="utf8")
            first = convert(root, "sample", "google")
            self.assertEqual(first, convert(root, "sample", "google"))
            self.assertFalse(marker.exists())
            self.assertEqual([s["id"] for s in first["symbols"]], ["sample", "sample.greet"])
            function = first["symbols"][1]
            self.assertEqual(function["parameters"][0]["description"], "Reader name.")
            self.assertEqual(function["returns"]["description"], "Greeting text.")
            self.assertNotIn(str(root), json.dumps(first))

    def test_field_facts_constructors_and_local_type_targets(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            (root / "sample.py").write_text(
                'from dataclasses import dataclass, field\n'
                '@dataclass\nclass Record:\n'
                '    name: str | None\n'
                '    parent: "Record | None" = None\n'
                '    labels: dict[str, str] = field(default_factory=dict)\n'
                'class Base: pass\n'
                'class Client(Base):\n'
                '    def __init__(self, name: str): pass\n'
                '    def fetch(self) -> Record: pass\n', encoding="utf8")
            symbols = {s["id"]: s for s in convert(root, "sample", "google")["symbols"]}
            self.assertTrue(symbols["sample.Record.name"]["required"])
            self.assertFalse(symbols["sample.Record.parent"]["required"])
            self.assertEqual(symbols["sample.Record.parent"]["default"], "None")
            self.assertIn("<factory>", symbols["sample.Record"]["constructorSignature"])
            self.assertEqual(symbols["sample.Client"]["constructorSignature"], "Client(name: str)")
            self.assertEqual(symbols["sample.Client"]["bases"], ["Base"])
            self.assertEqual(symbols["sample.Client.fetch"]["typeReferences"]["Record"], "sample.Record")

    def test_no_external_source_or_module_discovery(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            with self.assertRaises(ValueError):
                convert(root, "os", "google")
            (root / "escape.py").symlink_to(Path(__file__).resolve())
            with self.assertRaisesRegex(ValueError, "symlinks"):
                convert(root, "escape", "google")


if __name__ == "__main__":
    unittest.main()
