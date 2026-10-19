---
name: shoalrun-walkthrough
description: Turn notes, a tutorial, or a piece of code into a Shoalrun Walkthrough component that explains code step by step. Use when a user asks for a code walkthrough, a step-by-step code explanation, or to convert an existing guide's numbered code steps into one.
---

# Write a Shoalrun walkthrough

Read the component guide first with `shoalrun docs read guide.component.walkthrough`. It has the exact syntax, attributes, and build errors. Then read the source material: the user's notes, the guide being converted, and any code files it names.

Choose the mode from the material. Use separate steps, each with its own complete code, when the code grows or changes from step to step. Use one shared code block with a `highlight` per step when the steps explain parts of a single file. Use the default `scroll` layout for code that builds up in order, and `layout="spotlight"` for reference material that readers jump around in. A list of steps without code is an ordinary numbered list, not a walkthrough.

Give every step a short title and one to three sentences that say what the code does and why. Explain the lines the step highlights; don't restate the code. In separate mode, put the complete code at that point in each step, not only the new lines. Readers can then copy any step on its own. Highlight the lines that changed or that the step explains. Check that line numbers count from the first line shown.

When the code already exists in the project, take it from the file with `file` and `region` instead of copying it into a fence. The walkthrough then stays in sync with code the project runs. Adding `#region name` and `#endregion` comments changes project code, so tell the user which files you marked. Use `lines` only for files that rarely change.

Build with `shoalrun build docs.config.yaml <dedicated-output>`. Open the page's Markdown twin and check that every step has its title, explanation, and complete code in order. Open the HTML on a wide screen and scroll through the steps; each step's highlight should land on the lines its text describes. Fix build errors from their messages; they name the step and attribute at fault.

Report the page you changed and the mode and layout you chose, with your reasons. Name any project files you marked with regions and any walkthrough code that you didn't run.
