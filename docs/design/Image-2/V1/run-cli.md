# CLI Fallback Runbook

Use this only when the built-in Image2 / image generation tool is unavailable and `OPENAI_API_KEY` is set.

```bash
export IMAGE_GEN="$HOME/.codex/skills/.system/imagegen/scripts/image_gen.py"
export SRC="/Users/Totoro/Desktop/Firefly-Isle/docs/design/runtime-screenshots/2026-04-25"
export OUT="/Users/Totoro/Desktop/Firefly-Isle/docs/design/Image-2/V1"

python3 "$IMAGE_GEN" edit --model gpt-image-2 --quality high --size auto --image "$SRC/login-dark-full.png" --prompt-file "$OUT/prompts/01-login-dark.prompt.txt" --out "$OUT/01-login-dark.png"
python3 "$IMAGE_GEN" edit --model gpt-image-2 --quality high --size auto --image "$SRC/login-light-full.png" --prompt-file "$OUT/prompts/02-login-light.prompt.txt" --out "$OUT/02-login-light.png"
python3 "$IMAGE_GEN" edit --model gpt-image-2 --quality high --size auto --image "$SRC/app-dark-full.png" --prompt-file "$OUT/prompts/03-app-dark.prompt.txt" --out "$OUT/03-app-dark.png"
python3 "$IMAGE_GEN" edit --model gpt-image-2 --quality high --size auto --image "$SRC/app-light-full.png" --prompt-file "$OUT/prompts/04-app-light.prompt.txt" --out "$OUT/04-app-light.png"
python3 "$IMAGE_GEN" edit --model gpt-image-2 --quality high --size auto --image "$SRC/record-dark-full.png" --prompt-file "$OUT/prompts/05-record-dark.prompt.txt" --out "$OUT/05-record-dark.png"
python3 "$IMAGE_GEN" edit --model gpt-image-2 --quality high --size auto --image "$SRC/record-light-full.png" --prompt-file "$OUT/prompts/06-record-light.prompt.txt" --out "$OUT/06-record-light.png"
python3 "$IMAGE_GEN" edit --model gpt-image-2 --quality high --size auto --image "$SRC/app-dark-full.png" --image "$SRC/app-light-full.png" --image "$SRC/record-dark-full.png" --image "$SRC/record-light-full.png" --image "$SRC/login-dark-full.png" --image "$SRC/login-light-full.png" --prompt-file "$OUT/prompts/07-component-strip.prompt.txt" --out "$OUT/07-component-strip.png"
```

Notes:

- The first six commands are one screenshot per edit.
- The component strip intentionally uses all screenshots as references.
- If a target exists, add `--force` only after deciding to overwrite that specific output.
