#!/usr/bin/env python3
"""
Listens to every recorded clip of an edition and reports the ones that are off.

Nobody can listen to eight hundred clips after every re-record, and the
failures that matter are easy to miss one at a time: a German line read in an
English accent, a word swallowed or swapped. So a speech recognizer listens
instead, with two questions per clip:

  language  Does it hear the edition's language? A multilingual voice that
            drifted into English is heard as English.
  words     Does what it hears match the line the clip was recorded from?

It is a smoke alarm, not a judge. Recognition of a one-word clip ("Ja.",
"Tschüss!") is unreliable, so the words check only covers lines of three words
or more, and anything flagged is worth a listen rather than proof of a fault.

    python3 scripts/check_audio.py --locale de-DE [--model base|small]

Writes audio-report-<locale>.md (also appended to the GitHub job summary when
run in Actions) and exits 0 either way: it reports, it does not gate.
"""
import argparse
import difflib
import json
import os
import re
import subprocess
import sys
import unicodedata

from faster_whisper import WhisperModel

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Below this share for the edition's language, a clip is flagged.
LANGUAGE_FLOOR = 0.5
# Below this word-level similarity to the recorded text, a clip is flagged.
WORDS_FLOOR = 0.6
MIN_WORDS_FOR_TEXT_CHECK = 3


def normalize(text: str) -> list[str]:
    text = unicodedata.normalize("NFKD", text.lower())
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    text = text.replace("ß", "ss")
    return re.findall(r"[a-z0-9]+", text)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--locale", required=True)
    parser.add_argument("--model", default="base")
    args = parser.parse_args()

    locale = args.locale
    language = locale.split("-")[0]

    lines = json.loads(
        subprocess.check_output(
            ["node", os.path.join(ROOT, "scripts", "generate-audio.mjs"), "--locale", locale, "--print-lines"],
            cwd=ROOT,
        )
    )[locale]

    clip_dir = os.path.join(ROOT, "public", "audio", locale)
    with open(os.path.join(clip_dir, "index.json")) as f:
        manifest = json.load(f)
    voice = "unknown"
    try:
        with open(os.path.join(clip_dir, "voice.json")) as f:
            voice = json.load(f).get("voice", voice)
    except FileNotFoundError:
        pass

    model = WhisperModel(args.model, device="cpu", compute_type="int8")

    missing, wrong_language, wrong_words = [], [], []
    for i, line in enumerate(lines, 1):
        ext = manifest.get(line["id"])
        if not ext:
            missing.append(line)
            continue
        path = os.path.join(clip_dir, f"{line['id']}.{ext}")
        segments, info = model.transcribe(path, beam_size=1, vad_filter=False)
        heard = " ".join(s.text.strip() for s in segments).strip()

        probs = dict(info.all_language_probs or [])
        share = probs.get(language, 1.0 if info.language == language else 0.0)
        if share < LANGUAGE_FLOOR:
            wrong_language.append({**line, "heard": heard, "detected": info.language, "share": share})

        want = normalize(line["text"])
        if len(want) >= MIN_WORDS_FOR_TEXT_CHECK:
            ratio = difflib.SequenceMatcher(a=want, b=normalize(heard)).ratio()
            if ratio < WORDS_FLOOR:
                wrong_words.append({**line, "heard": heard, "ratio": ratio})

        if i % 50 == 0:
            print(f"  {i}/{len(lines)}", flush=True)

    out = [
        f"# Audio check: {locale} ({voice})",
        "",
        f"{len(lines)} lines, {len(missing)} without a clip, "
        f"{len(wrong_language)} not heard as `{language}`, "
        f"{len(wrong_words)} whose words do not match.",
        "",
    ]
    if missing:
        out += ["## No clip", ""] + [f"- `{l['id']}` {l['text']}" for l in missing] + [""]
    if wrong_language:
        out += ["## Not heard as the edition's language", "", "| clip | line | heard as | share | heard |", "|---|---|---|---|---|"]
        for r in sorted(wrong_language, key=lambda r: r["share"]):
            out.append(f"| `{r['id']}` | {r['text']} | {r['detected']} | {r['share']:.2f} | {r['heard']} |")
        out.append("")
    if wrong_words:
        out += ["## Words do not match", "", "| clip | line | heard | match |", "|---|---|---|---|"]
        for r in sorted(wrong_words, key=lambda r: r["ratio"]):
            out.append(f"| `{r['id']}` | {r['text']} | {r['heard']} | {r['ratio']:.2f} |")
        out.append("")

    report = "\n".join(out)
    with open(os.path.join(ROOT, f"audio-report-{locale}.md"), "w") as f:
        f.write(report)
    summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary:
        with open(summary, "a") as f:
            f.write(report + "\n")
    print(out[2])


if __name__ == "__main__":
    sys.exit(main())
