#!/usr/bin/env python3
"""
One line through Edge TTS, with the language it is actually in.

edge-tts writes every request as `<speak xml:lang='en-US'>`, whatever the voice
and whatever the text. A single-language voice (Sofie, Katja) ignores it. A
multilingual one (Seraphina) takes it as a hint that the text may be English,
and a short German line, or one with a loanword in it ("Pils", "Okay",
"Sorry"), came out in an English accent. So this replaces the document edge-tts
builds with one that names the line's locale, and for multilingual voices also
wraps the text in `<lang>`, which is how Azure is told outright which language
a multilingual voice should speak.

Called by scripts/generate-audio.mjs, one line per call:

    python3 scripts/edge_say.py --voice de-DE-SeraphinaMultilingualNeural \
        --locale de-DE --rate=-5% --text "Ein Pils, bitte." --out out.mp3
"""
import argparse
import asyncio

import edge_tts
import edge_tts.communicate as communicate


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--voice", required=True)
    parser.add_argument("--locale", required=True)
    parser.add_argument("--text", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--rate", default="+0%")
    args = parser.parse_args()

    locale = args.locale
    multilingual = "multilingual" in args.voice.lower()

    def mkssml(tc, escaped_text):
        if isinstance(escaped_text, bytes):
            escaped_text = escaped_text.decode("utf-8")
        body = f"<lang xml:lang='{locale}'>{escaped_text}</lang>" if multilingual else escaped_text
        return (
            "<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' "
            f"xml:lang='{locale}'>"
            f"<voice name='{tc.voice}'>"
            f"<prosody pitch='{tc.pitch}' rate='{tc.rate}' volume='{tc.volume}'>"
            f"{body}"
            "</prosody>"
            "</voice>"
            "</speak>"
        )

    # Module attribute, looked up at call time by Communicate.stream.
    communicate.mkssml = mkssml

    asyncio.run(edge_tts.Communicate(args.text, args.voice, rate=args.rate).save(args.out))


if __name__ == "__main__":
    main()
