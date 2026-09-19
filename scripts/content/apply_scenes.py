"""Applies authored practice scenes to a content file.

Scenes are practice-only exchanges written around the words already in a
subsection's phrase list; the words they cover come out of the deck with
`practice: false` and stay on the scenario page untouched. See
content/schema.md.

The file is patched as text rather than parsed and rewritten. A round trip
through json.dumps reformats every line it did not change — leaf objects in
these files sit on one line, and a dumper that expands them turns a hundred-line
addition into a seven-thousand-line diff nobody can review. So the JSON is
parsed only to find things and to check them; the bytes that come out are the
bytes that went in, plus the insertions.

Run: python3 scripts/content/apply_scenes.py <locale> <module>
"""
import json
import sys
import pathlib
import importlib.util

ROOT = pathlib.Path(__file__).resolve().parents[2]


def scene(sid, teaches, speaker, situation, q_es, q_en, a_es, a_en, r_es=None, r_en=None,
          notes="", difficulty="medium", region=None, young=False, women=False):
    out = {
        "id": sid,
        "teaches": teaches,
        "speaker": speaker,
        "situation": {"en": situation},
        "question": {"es": q_es, "en": q_en},
        "answers": [{"es": a_es, "en": a_en}],
        "likelyReply": {"es": r_es, "en": r_en} if r_es else None,
        "notes": notes,
        "difficulty": difficulty,
    }
    if region:
        out["region"] = region
    if young:
        out["young"] = True
    if women:
        out["women"] = True
    out["quizQuestions"] = []
    return out


def j(value):
    """One value, in the house style: no space after ':' inside a leaf object."""
    return json.dumps(value, ensure_ascii=False)


def inline(obj):
    return "{ " + ", ".join(f"{j(k)}: {j(v)}" for k, v in obj.items()) + " }"


def render_scene(item, pad):
    """One exchange, laid out the way the exchanges already in the file are."""
    lines = [f"{pad}{{"]
    inner = pad + "  "
    for key, value in item.items():
        if key == "answers":
            lines.append(f'{inner}"answers": [')
            for i, answer in enumerate(value):
                comma = "," if i < len(value) - 1 else ""
                lines.append(f"{inner}  {inline(answer)}{comma}")
            lines.append(f"{inner}],")
        elif isinstance(value, dict):
            lines.append(f"{inner}{j(key)}: {inline(value)},")
        else:
            lines.append(f"{inner}{j(key)}: {j(value)},")
    lines[-1] = lines[-1][:-1]  # last field takes no comma
    lines.append(f"{pad}}}")
    return "\n".join(lines)


def close_of(text, open_index):
    """Index of the brace closing the object that opens at `open_index`."""
    depth = 0
    in_string = False
    escaped = False
    for i in range(open_index, len(text)):
        ch = text[i]
        if in_string:
            if escaped:
                escaped = False
            elif ch == "\\":
                escaped = True
            elif ch == '"':
                in_string = False
            continue
        if ch == '"':
            in_string = True
        elif ch in "{[":
            depth += 1
        elif ch in "}]":
            depth -= 1
            if depth == 0:
                return i
    raise SystemExit("unbalanced JSON")


def apply(locale, plan):
    path = ROOT / "content" / f"{locale}.json"
    text = path.read_text(encoding="utf8")
    data = json.loads(text)

    subs = {}
    for category in data["categories"]:
        for sub in category["subsections"]:
            subs[sub["id"]] = sub

    for sub_id, spec in plan.items():
        if sub_id not in subs:
            raise SystemExit(f"no subsection {sub_id} in {locale}")
        sub = subs[sub_id]
        keep = set(spec["keep"])
        phrases = sub.get("phrases", [])
        known = {p["id"] for p in phrases}
        missing = keep - known
        if missing:
            raise SystemExit(f"{sub_id}: kept ids not in this subsection: {sorted(missing)}")

        scenes = [dict(s) for s in spec["scenes"]]

        if phrases:
            taught = {s["teaches"] for s in scenes}
            stray = taught - known
            if stray:
                raise SystemExit(f"{sub_id}: scenes teach ids not here: {sorted(stray)}")
            dropped = known - keep
            if dropped != taught:
                raise SystemExit(
                    f"{sub_id}: dropped from practice but taught by no scene: "
                    f"{sorted(dropped - taught)}; taught but still asked: "
                    f"{sorted(taught - dropped)}"
                )
        else:
            # Scenes on a dialogue subsection are material that was missing
            # rather than a word's replacement, so there is nothing to mark.
            for s in scenes:
                s.pop("teaches", None)

        # --- mark the words the scenes take over -----------------------
        # Inserted straight after the id, in whichever layout that phrase
        # happens to use: most sit on one line, a few with long glosses are
        # spread over several, and both are the file's own style.
        for phrase in phrases:
            if phrase["id"] in keep:
                continue
            needle = f'"id": {j(phrase["id"])},'
            if text.count(needle) != 1:
                raise SystemExit(f"{phrase['id']}: {text.count(needle)} matches, expected 1")
            at = text.index(needle) + len(needle)
            if '"practice"' in text[at:at + 200]:
                continue
            if text[at] == "\n":
                rest = text[at + 1:]
                pad = rest[: len(rest) - len(rest.lstrip())]
                text = text[:at] + f'\n{pad}"practice": false,' + text[at:]
            else:
                text = text[:at] + ' "practice": false,' + text[at:]

        # --- hang the scenes off the end of the subsection --------------
        anchor = f'"id": {j(sub_id)},'
        at = text.index(anchor)
        start = text.rindex("{", 0, at)
        end = close_of(text, start)
        pad = " " * (len(text[:start].rsplit("\n", 1)[-1]))
        body = ",\n".join(render_scene(s, pad + "    ") for s in scenes)
        block = f',\n{pad}  "scenes": [\n{body}\n{pad}  ]'
        # After the last field's closing bracket, not before the subsection's
        # closing brace: the separating comma belongs on the line it ends.
        tail = len(text[:end].rstrip())
        text = text[:tail] + block + text[tail:]

    json.loads(text)  # a patch that produced invalid JSON is not worth writing
    path.write_text(text, encoding="utf8")
    total = sum(len(s["scenes"]) for s in plan.values())
    print(f"{locale}: {total} scenes across {len(plan)} subsections")


if __name__ == "__main__":
    locale, module = sys.argv[1], sys.argv[2]
    spec = importlib.util.spec_from_file_location("plan", ROOT / module)
    mod = importlib.util.module_from_spec(spec)
    sys.modules["plan"] = mod
    mod.scene = scene
    spec.loader.exec_module(mod)
    apply(locale, mod.PLAN)
