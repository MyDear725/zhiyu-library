import os
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path(os.environ.get(
    "QA_SOURCE",
    r"C:\Users\39006\.codex\generated_images\01a01e46-2e8f-72c3-8ccf-77cc765f5830\exec-806502ef-fe10-4665-9542-1390089b63b0.png",
))
IMPLEMENTATION = Path(os.environ.get(
    "QA_IMPLEMENTATION",
    ROOT / "design-qa-assets" / "home-implementation-final-02.png",
))
OUTPUT = Path(os.environ.get(
    "QA_COMPARISON_OUTPUT",
    ROOT / "design-qa-assets" / "home-comparison-final.png",
))
SOURCE_LABEL = os.environ.get("QA_SOURCE_LABEL", "Reference direction")
IMPLEMENTATION_LABEL = os.environ.get("QA_IMPLEMENTATION_LABEL", "Final implementation")


implementation = Image.open(IMPLEMENTATION).convert("RGB")
source = Image.open(SOURCE).convert("RGB")
target_width, target_height = implementation.size

scale = target_width / source.width
source = source.resize((target_width, round(source.height * scale)), Image.Resampling.LANCZOS)
source = source.crop((0, 0, target_width, target_height))

gap = 16
header = 44
canvas = Image.new("RGB", (target_width * 2 + gap, target_height + header), "#EAF1F6")
canvas.paste(source, (0, header))
canvas.paste(implementation, (target_width + gap, header))

draw = ImageDraw.Draw(canvas)
try:
    font = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 20)
except OSError:
    font = ImageFont.load_default()
draw.text((18, 11), SOURCE_LABEL, fill="#0A3658", font=font)
draw.text((target_width + gap + 18, 11), IMPLEMENTATION_LABEL, fill="#0A3658", font=font)
draw.rectangle((target_width, 0, target_width + gap - 1, canvas.height), fill="#D3E2ED")

OUTPUT.parent.mkdir(parents=True, exist_ok=True)
canvas.save(OUTPUT, optimize=True)
print(OUTPUT)
