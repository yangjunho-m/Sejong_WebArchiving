"""Flatten the approved overlapping masthead into an email-safe animation."""
from pathlib import Path
from PIL import Image

P = Path(__file__).resolve().parent
A = P / 'assets'
W = 600
header = Image.open(A / 'header.png').convert('RGBA').resize((W, 86), Image.Resampling.LANCZOS)
title = Image.open(A / 'title.png').convert('RGBA').resize((W, 232), Image.Resampling.LANCZOS)
source = Image.open(A / 'motion.gif')
frames, durations = [], []
for index in range(source.n_frames):
    source.seek(index)
    duration = source.info.get('duration', 40)
    if index % 2:
        durations[-1] += duration
        continue
    canvas = Image.new('RGBA', (W, 666), '#141414')
    motion = source.convert('RGBA').resize((W, W), Image.Resampling.LANCZOS)
    canvas.alpha_composite(motion, (0, -34))
    canvas.alpha_composite(header, (0, 0))
    canvas.alpha_composite(title, (0, 434))
    if index == source.n_frames // 2 - (source.n_frames // 2 % 2):
        canvas.convert('RGB').save(P / 'gmail-hero-preview.png')
    frames.append(canvas.convert('RGB').quantize(colors=192))
    durations.append(duration)
frames[0].save(A / 'gmail-hero.gif', save_all=True, append_images=frames[1:],
               duration=durations, loop=0, disposal=1, optimize=True)
print('Created gmail-hero.gif:', len(frames), 'frames,', (A / 'gmail-hero.gif').stat().st_size, 'bytes')
