#!/usr/bin/env python3
"""Convert local Python source to Shoalrun code-reference JSON without importing it."""
import argparse
import ast
import hashlib
import importlib.metadata
import json
import os
from pathlib import Path
import re
import sys

VERSION = "1.0.0"
EXTRACTOR_VERSION = "2.4.1"


def convert(root, module, style):
    if importlib.metadata.version("griffelib") != EXTRACTOR_VERSION:
        raise ValueError(f"This adapter requires griffelib=={EXTRACTOR_VERSION}")
    import griffe

    root = root.resolve(strict=True)
    if not root.is_dir() or not re.fullmatch(r"[A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*", module):
        raise ValueError("Provide a local source directory and a dotted Python module name")
    # Reject symlinks before the extractor can follow any source outside this root.
    digest = hashlib.sha256()
    count = size = 0
    for directory, dirs, files in os.walk(root, followlinks=False):
        for name in dirs + files:
            if (Path(directory) / name).is_symlink():
                raise ValueError("Python source roots must not contain symlinks")
        for name in sorted(files):
            file = Path(directory) / name
            if file.suffix not in (".py", ".pyi"):
                continue
            data = file.read_bytes()
            size += len(data)
            count += 1
            if count > 10000 or size > 32 * 1024 * 1024:
                raise ValueError("Python source root exceeds 10,000 files or 32 MiB")
            relative = file.relative_to(root).as_posix().encode()
            digest.update(len(relative).to_bytes(4, "big") + relative + len(data).to_bytes(8, "big") + data)
        dirs.sort()
    target = root.joinpath(*module.split("."))
    if not target.with_suffix(".py").is_file() and not (target / "__init__.py").is_file():
        raise ValueError("Requested module must exist as Python source under --root")
    loaded = griffe.load(module, search_paths=[root], try_relative_path=False,
                         extensions=griffe.Extensions(), allow_inspection=False,
                         force_inspection=False, resolve_aliases=False,
                         resolve_external=False, find_stubs_package=False,
                         docstring_parser=style)
    symbols = []

    def field_info(obj):
        info = {}
        if obj.annotation is not None:
            info["annotation"] = str(obj.annotation)
        if obj.value is not None:
            info["default"] = str(obj.value)
        parent = obj.parent
        if parent and parent.is_class and "dataclass" in parent.labels and "instance-attribute" in obj.labels:
            if obj.value is None:
                info["required"] = True
            elif str(obj.value).startswith("field("):
                call = ast.parse(str(obj.value), mode="eval").body
                options = {keyword.arg: keyword.value for keyword in call.keywords}
                if "init" not in options:
                    info["required"] = not ("default" in options or "default_factory" in options)
                elif isinstance(options["init"], ast.Constant) and options["init"].value is False:
                    info["required"] = False
            else:
                info["required"] = False
        elif parent and parent.is_class and any(str(base) in ("TypedDict", "typing.TypedDict", "typing_extensions.TypedDict") for base in parent.bases):
            annotation = str(obj.annotation).split("[", 1)[0].rsplit(".", 1)[-1]
            info["required"] = annotation != "NotRequired" and (annotation == "Required" or str(parent.keywords.get("total", "True")) != "False")
        return info

    def type_references(obj, expressions):
        references = {}
        for expression in expressions:
            if expression is None:
                continue
            if isinstance(expression, str):
                for token in re.findall(r"[A-Za-z_]\w*(?:\.\w+)*", expression):
                    try:
                        references[token] = obj.resolve(token)
                    except griffe.NameResolutionError:
                        pass
            else:
                for part in [expression, *expression.iterate()]:
                    if isinstance(part, griffe.Expr) and part.reference_path:
                        references[str(part)] = part.reference_path
        return references

    def visit(obj, parent=None):
        if obj.is_alias or (obj.name.startswith("_") and obj.name != "__init__"):
            return
        kind = obj.kind.value
        if kind == "function" and parent is not None and obj.parent.is_class:
            kind = "constructor" if obj.name == "__init__" else "method"
        if obj.is_class and any(str(base) in ("Enum", "IntEnum", "StrEnum", "enum.Enum", "enum.IntEnum", "enum.StrEnum") for base in obj.bases):
            kind = "enum"
        if kind == "type alias":
            kind = "type"
        symbol = {"id": obj.path, "name": obj.name, "kind": kind, "visibility": "public"}
        if parent:
            symbol["parent"] = parent
        file = obj.filepath.resolve(strict=True)
        relative = file.relative_to(root).as_posix()
        symbol["source"] = {"path": relative}
        if obj.lineno:
            symbol["source"]["line"] = obj.lineno
        sections = obj.docstring.parsed if obj.docstring else []
        prose = []
        parameter_docs = {}
        for section in sections:
            section_kind = section.kind.value
            if section_kind == "text":
                prose.append(section.value)
            elif section_kind == "parameters":
                parameter_docs.update({p.name: p for p in section.value})
            elif section_kind == "raises":
                symbol["raises"] = [{"name": str(p.annotation or p.name or "Exception"), "description": p.description} for p in section.value]
            elif section_kind in ("returns", "yields") and len(section.value) == 1:
                item = section.value[0]
                symbol[section_kind] = {"description": item.description}
                if item.annotation is not None:
                    symbol[section_kind]["type"] = str(item.annotation)
            elif section_kind == "examples":
                examples = []
                for example_kind, value in section.value:
                    if example_kind.value == "text":
                        prose.append(value)
                    else:
                        examples.append({"code": value})
                if examples:
                    symbol["examples"] = examples
            else:
                # Preserve less-common sections rather than silently losing their prose.
                if obj.docstring:
                    prose = [obj.docstring.value]
                    symbol.pop("returns", None)
                    symbol.pop("yields", None)
                    symbol.pop("raises", None)
                    symbol.pop("examples", None)
                    break
        if prose:
            symbol["description"] = "\n\n".join(prose)
            symbol["summary"] = prose[0].split("\n", 1)[0][:1000]
        annotations = []
        if obj.is_function:
            annotations.extend([obj.returns, *(p.annotation for p in obj.parameters)])
            prefix = "async def " if "async" in obj.labels else "def "
            signatures = obj.overloads or [obj]
            symbol["signatures"] = [prefix + entry.signature() for entry in signatures]
            params = []
            for parameter in obj.parameters:
                if parameter.name in ("self", "cls") and obj.parent.is_class:
                    continue
                detail = {"name": parameter.name}
                if parameter.annotation is not None:
                    detail["type"] = str(parameter.annotation)
                if parameter.default is not None:
                    detail["default"] = str(parameter.default)
                if parameter.name in parameter_docs:
                    detail["description"] = parameter_docs[parameter.name].description
                params.append(detail)
            if params:
                symbol["parameters"] = params
            if obj.returns is not None:
                symbol.setdefault("returns", {})["type"] = str(obj.returns)
        elif obj.is_class:
            annotations.extend(obj.bases)
            if obj.bases:
                symbol["bases"] = [str(base) for base in obj.bases]
            constructor = obj.members.get("__init__")
            if constructor is not None and not constructor.is_alias and constructor.is_function:
                symbol["constructorSignature"] = constructor.signature(name=obj.name, return_type=False)
                annotations.extend(p.annotation for p in constructor.parameters)
            elif "dataclass" in obj.labels and not obj.bases and not any("init=" in str(decorator.value) or "kw_only=" in str(decorator.value) for decorator in obj.decorators):
                # Synthesize only the simple local dataclass case; never execute decorators.
                fields = [member for member in obj.attributes.values() if "instance-attribute" in member.labels]
                if all(field_info(member).get("required") is not None and (not str(member.value).startswith("field(") or str(member.value).startswith("field(default_factory=")) for member in fields):
                    declarations = []
                    for member in fields:
                        info = field_info(member)
                        default = "<factory>" if str(member.value).startswith("field(default_factory=") else info.get("default")
                        declarations.append(member.name + (": " + info["annotation"] if "annotation" in info else "") + (" = " + default if default is not None else ""))
                        annotations.append(member.annotation)
                    symbol["constructorSignature"] = obj.name + "(" + ", ".join(declarations) + ")"
            symbol["signatures"] = ["class " + obj.name + ("(" + ", ".join(map(str, obj.bases)) + ")" if obj.bases else "")]
        elif obj.is_attribute:
            annotations.append(obj.annotation)
            symbol.update(field_info(obj))
            annotation = ": " + str(obj.annotation) if obj.annotation is not None else ""
            symbol["signatures"] = [obj.name + annotation]
        annotations.extend(item["name"] for item in symbol.get("raises", []))
        references = type_references(obj, annotations)
        if references:
            symbol["typeReferences"] = references
        symbols.append(symbol)
        for child in sorted(getattr(obj, "members", {}).values(), key=lambda item: item.name):
            visit(child, obj.path)

    visit(loaded)
    known = {symbol["id"] for symbol in symbols}
    for symbol in symbols:
        if "typeReferences" in symbol:
            symbol["typeReferences"] = {name: target for name, target in symbol["typeReferences"].items() if target in known}
            if not symbol["typeReferences"]:
                del symbol["typeReferences"]
    return {"schemaVersion": 1, "kind": "shoalrun-code-reference", "programmingLanguage": "python",
            "producer": {"name": "shoalrun-python", "version": VERSION, "extractorVersion": EXTRACTOR_VERSION},
            "sourceDigest": digest.hexdigest(), "symbols": symbols}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, required=True)
    parser.add_argument("--module", required=True)
    parser.add_argument("--style", choices=("google", "numpy", "sphinx"), default="google")
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    try:
        data = convert(args.root, args.module, args.style)
        args.out.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf8")
    except (ImportError, importlib.metadata.PackageNotFoundError):
        parser.exit(1, "Install the adapter's pinned requirements in Python 3.11+ before running it.\n")
    except (ValueError, OSError) as error:
        parser.exit(1, f"{error}\n")


if __name__ == "__main__":
    main()
