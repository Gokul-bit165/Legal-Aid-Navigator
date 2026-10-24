"""
Builds the captioned walkthrough video from the raw clips.
Run from this folder:  python build.py
Output: <project>/walkthrough_footage/Legal_Aid_Navigator_Walkthrough.mp4  (+ chapters + .srt)
"""
import os
import re
import shutil
import subprocess
import sys

import imageio_ffmpeg

FF = imageio_ffmpeg.get_ffmpeg_exe()
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = r"C:\Users\gokul\Downloads\ZIRO_hackathon\ZIRO_hackathon\walkthrough_footage"
OUT_MP4 = os.path.join(SRC, "Legal_Aid_Navigator_Walkthrough.mp4")
os.chdir(HERE)
for sub in ("seg", "txt"):
    shutil.rmtree(sub, ignore_errors=True)
    os.makedirs(sub)
for font in ("georgiab.ttf", "segoeui.ttf", "segoeuib.ttf"):
    shutil.copy(os.path.join(r"C:\Windows\Fonts", font), font)

# ── brand colours (match the app) ────────────────────────────────────────────
BG = "0x4A4A2A"      # olive
BG_DARK = "0x1E1E0E"
IVORY = "0xF5F0E8"
SAND = "0xC8BFA8"
ACCENT = "0xC9D18A"
RED = "0xE8836F"

W, H, FPS = 1920, 1080, 30
BAND = 132           # caption band height


def run(args):
    r = subprocess.run([FF, "-hide_banner", "-loglevel", "error", "-y"] + args, capture_output=True, text=True)
    if r.returncode != 0:
        print("FFMPEG FAILED:\n", " ".join(args)[:600], "\n", r.stderr[-1500:])
        sys.exit(1)


def write_txt(name, text):
    path = f"txt/{name}.txt"
    with open(path, "w", encoding="utf-8", newline="") as f:
        f.write(text)
    return path


def duration(path):
    r = subprocess.run([FF, "-hide_banner", "-i", path], capture_output=True, text=True)
    m = re.search(r"Duration: (\d+):(\d+):([\d.]+)", r.stderr)
    return int(m[1]) * 3600 + int(m[2]) * 60 + float(m[3])


timeline = []      # (label, start_s, end_s)
captions = []      # (start_s, end_s, text)
parts = []         # segment files in order
clock = [0.0]


def add_part(path, label=None, caption=None):
    d = duration(path)
    if label:
        timeline.append((label, clock[0], clock[0] + d))
    if caption:
        captions.append((clock[0] + 0.25, clock[0] + d - 0.25, caption))
    clock[0] += d
    parts.append(path)


# ── cards ───────────────────────────────────────────────────────────────────
def card(name, dur, kicker, title, lines=(), label=None, title_size=84, line_size=40, align_left=False):
    n = len(parts)
    tid = f"{n:02d}_{name}"
    filters = []
    x = "120" if align_left else "(w-text_w)/2"
    y = 300 if lines else 440
    if kicker:
        p = write_txt(f"{tid}_k", kicker)
        filters.append(f"drawtext=fontfile=segoeuib.ttf:textfile={p}:expansion=none:fontsize=30:fontcolor={ACCENT}:x={x}:y={y - 70}")
    p = write_txt(f"{tid}_t", title)
    filters.append(f"drawtext=fontfile=georgiab.ttf:textfile={p}:expansion=none:fontsize={title_size}:fontcolor={IVORY}:x={x}:y={y}:line_spacing=14")
    ty = y + (title.count("\n") + 1) * (title_size + 14) + 40
    for i, line in enumerate(lines):
        yy = ty + i * (line_size + 30)
        if isinstance(line, tuple):                      # (label, text, label colour): two aligned columns
            label_txt, body_txt, col = line
            pl = write_txt(f"{tid}_l{i}a", label_txt)
            pb = write_txt(f"{tid}_l{i}b", body_txt)
            filters.append(f"drawtext=fontfile=segoeuib.ttf:textfile={pl}:expansion=none:fontsize={line_size}:fontcolor={col}:x=120:y={yy}")
            filters.append(f"drawtext=fontfile=segoeui.ttf:textfile={pb}:expansion=none:fontsize={line_size}:fontcolor={IVORY}:x=470:y={yy}")
        else:
            p = write_txt(f"{tid}_l{i}", line)
            filters.append(f"drawtext=fontfile=segoeui.ttf:textfile={p}:expansion=none:fontsize={line_size}:fontcolor={IVORY}:x={x}:y={yy}")
    filters.append(f"fade=t=in:st=0:d=0.5,fade=t=out:st={dur - 0.5}:d=0.5")
    out = f"seg/{tid}.mp4"
    run(["-f", "lavfi", "-i", f"color=c={BG}:s={W}x{H}:r={FPS}:d={dur}", "-vf", ",".join(filters) + ",format=yuv420p",
         "-an", "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", out])
    add_part(out, label)


# ── clip segments with a caption band ───────────────────────────────────────
def seg(clip, start, end, speed, tag, text, label=None):
    n = len(parts)
    tid = f"{n:02d}_{os.path.splitext(clip)[0][:2]}"
    d = (end - start) / speed
    tag_p = write_txt(f"{tid}_tag", tag)
    cap_p = write_txt(f"{tid}_cap", text)
    en = f"enable='between(t,0.25,{d - 0.25:.3f})'"
    vf = (
        f"setpts=PTS/{speed},fps={FPS},scale={W}:{H}:flags=lanczos,"
        f"drawbox=x=0:y=ih-{BAND}:w=iw:h={BAND}:color={BG_DARK}@0.90:t=fill:{en},"
        f"drawbox=x=0:y=ih-{BAND}:w=14:h={BAND}:color={ACCENT}@1:t=fill:{en},"
        f"drawtext=fontfile=segoeuib.ttf:textfile={tag_p}:expansion=none:fontsize=24:fontcolor={ACCENT}:x=60:y=h-{BAND}+24:{en},"
        f"drawtext=fontfile=segoeui.ttf:textfile={cap_p}:expansion=none:fontsize=40:fontcolor={IVORY}:x=60:y=h-{BAND}+64:{en},"
        f"format=yuv420p"
    )
    out = f"seg/{tid}.mp4"
    run(["-ss", f"{start}", "-t", f"{end - start}", "-i", os.path.join(SRC, clip), "-vf", vf,
         "-an", "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", out])
    add_part(out, label, f"[{tag}] {text}")


C01 = "01_applicant_form_to_review.webm"
C02 = "02_applicant_status_tracker.webm"
C03 = "03_staff_dashboard_and_fee_flag.webm"
C04 = "04_applicant_refused_by_fee.webm"
C05 = "05_staff_clears_fee.webm"
C06 = "06_applicant_approves_and_confirmed.webm"
C07 = "07_staff_confirmed_and_audit_trail.webm"
C08 = "08_staff_urgent_and_pending.webm"
C09 = "09_staff_filters_and_all_pages.webm"

# ═════════════════════════════ OPENING ═════════════════════════════
card("title", 5.0, "ZIRO AGENTIC AI HACKATHON  ·  LEGAL AID APPOINTMENT NAVIGATOR",
     "Legal Aid Navigator",
     ["Find free legal aid. Book safely. Verify what actually happened."], label="Title", title_size=110, line_size=44)

card("problem", 7.0, "THE PROBLEM", "Free legal help is hard to find\nand harder to trust",
     ["People who cannot afford a lawyer do not know whether free aid exists for them,",
      "which office covers their district, or how to book a consultation.",
      "And once they ask, they cannot tell if the booking is real or still pending."],
     label="The problem", title_size=70, line_size=36, align_left=True)

card("how", 9.0, "HOW IT WORKS", "Agents recommend.  Code enforces safety.\nPeople approve.",
     [("1  RECOMMEND", "n8n workflow + Gemini read the case and the official directories", ACCENT),
      ("2  REQUEST", "the chosen service is validated, checked against a catalogue, saved once", ACCENT),
      ("3  APPROVE", "the applicant approves a slot  -  nothing is booked before this", ACCENT),
      ("4  VERIFY", "status comes from the stored booking record, never assumed", ACCENT),
      "Fees, urgency and status are plain rules in code.  Every action is logged.  No legal advice."],
     label="How it works", title_size=62, line_size=34, align_left=True)

# ═════════════════════════════ CHAPTER 1 ═════════════════════════════
card("ch1", 2.8, "CHAPTER 1  ·  APPLICANT", "An applicant asks for help", label="Chapter 1 - Applicant requests help")
seg(C01, 0.8, 7.0, 2.0, "APPLICANT", "Sign in to the applicant app")
seg(C01, 7.0, 15.0, 1.6, "APPLICANT", "Step 1 of 6  ·  Location: state and district")
seg(C01, 15.0, 23.5, 1.6, "APPLICANT", "Step 2  ·  The legal issue, any court case, and urgency")
seg(C01, 23.5, 28.0, 1.5, "APPLICANT", "Step 3  ·  Eligibility is collected as evidence, never auto-decided")
seg(C01, 28.0, 39.5, 1.8, "APPLICANT", "Step 4  ·  Contact details stay in our database and are never sent to the AI")
seg(C01, 39.5, 44.5, 1.5, "APPLICANT", "Step 5  ·  Preferred appointment date and time")
seg(C01, 44.5, 57.0, 1.3, "APPLICANT", "Step 6  ·  Review everything, then give three separate consents")
seg(C01, 57.0, 67.0, 2.5, "AGENT  ·  WORKFLOW 1", "n8n and Gemini read the case and the official legal aid directory")
seg(C01, 67.0, 79.0, 1.2, "AGENT  ·  WORKFLOW 1", "Listed in an official directory  -  fees and availability still marked 'needs verification'")
seg(C01, 79.0, 85.0, 1.0, "APPLICANT", "The applicant selects a service and submits it for human review")
seg(C01, 85.0, 96.2, 1.0, "AGENT  ·  WORKFLOW 2", "Saved as 'pending human review'  -  nothing is booked and no provider is assigned")
seg(C02, 9.45, 17.5, 1.0, "APPLICANT", "The workflow pauses at step 5 and waits for the applicant's approval")

# ═════════════════════════════ CHAPTER 2 (TC2) ═════════════════════════════
card("ch2", 3.2, "CHAPTER 2  ·  TEST CASE 2", "An unexpected fee\nstops the booking", label="Chapter 2 - TC2 unexpected fee", title_size=80)
seg(C03, 6.95, 17.0, 1.5, "STAFF", "Admin dashboard: every application with its status and urgent flags")
seg(C03, 17.0, 30.0, 1.5, "STAFF", "Staff open an application: progress, applicant details and the audit trail")
seg(C03, 30.0, 40.9, 1.0, "STAFF  ·  TC2", "The portal reports an unexpected fee  -  staff flag it and the booking is stopped")
seg(C04, 9.45, 13.0, 1.0, "APPLICANT  ·  TC2", "The applicant picks a slot and clicks Confirm Appointment")
seg(C04, 13.0, 19.85, 1.0, "APPLICANT  ·  TC2", "Refused  -  even after approval, an unexpected fee stops the booking")

# ═════════════════════════════ CHAPTER 3 (TC1) ═════════════════════════════
card("ch3", 3.2, "CHAPTER 3  ·  TEST CASE 1", "Fee resolved: the booking is\nconfirmed and verified", label="Chapter 3 - TC1 booking confirmed", title_size=76)
seg(C05, 7.05, 20.7, 1.3, "STAFF  ·  TC2", "Fee resolved  -  staff clear the flag so the booking can continue")
seg(C06, 9.45, 14.0, 1.0, "APPLICANT  ·  TC1", "The applicant approves a slot  -  only now does the booking run")
seg(C06, 14.0, 24.0, 2.0, "APPLICANT  ·  TC1", "The booking is processed and a booking record is stored")
seg(C06, 24.0, 37.4, 1.3, "APPLICANT  ·  TC1", "Confirmed  -  the tracker shows step 6 complete")
seg(C07, 7.15, 12.5, 1.0, "STAFF  ·  TC1", "Staff open the same application")
seg(C07, 12.5, 20.0, 1.0, "STAFF  ·  TC1", "Appointment Confirmed  -  a booking record exists and its date is verified")
seg(C07, 20.0, 29.4, 1.0, "STAFF", "Every decision is in the audit trail, from submission to confirmation")

# ═════════════════════════════ CHAPTER 4 (TC3 / TC4) ═════════════════════════════
card("ch4", 3.2, "CHAPTER 4  ·  TEST CASES 3 AND 4", "Urgent requests are flagged.\nPending is never \"assigned\".", label="Chapter 4 - TC3 urgent, TC4 pending", title_size=72)
seg(C08, 7.25, 24.5, 1.2, "STAFF  ·  TC3", "Court deadline in three days  -  flagged URGENT by a rule, not by the AI")
seg(C08, 24.5, 29.5, 1.5, "STAFF  ·  TC4", "Next: a booking that is still pending")
seg(C08, 29.5, 39.0, 1.0, "STAFF  ·  TC4", "The portal has not confirmed it  -  \"No lawyer has been assigned\"")
seg(C08, 39.0, 47.7, 1.0, "STAFF  ·  TC4", "Staff try to mark it Confirmed  -  rejected: no booking confirmation on record")

# ═════════════════════════════ CHAPTER 5 ═════════════════════════════
card("ch5", 2.8, "CHAPTER 5  ·  ADMIN PORTAL", "Every application, one place", label="Chapter 5 - Admin portal")
seg(C09, 7.25, 22.0, 1.5, "STAFF", "Filter by status, search and page through every application")
seg(C09, 22.0, 45.1, 1.5, "STAFF", "Users  ·  Appointments  ·  Authorities  ·  Reports  ·  Settings")

# ═════════════════════════════ CLOSING ═════════════════════════════
card("honest", 10.0, "WHAT IS REAL, WHAT IS SIMULATED", "Being clear about the limits",
     [("REAL", "two live n8n workflows (Gemini + official directories), role-based apps, rules in code, audit trail", ACCENT),
      ("SIMULATED", "the booking portal  -  slots and confirmations are generated by our own backend", RED),
      ("MANUAL", "in this demo a fee is flagged by staff; it is not yet detected from a portal", RED),
      ("NEXT", "a mock legal aid portal with real pending / confirmed / fee states, then deployment", ACCENT)],
     label="Real vs simulated", title_size=68, line_size=32, align_left=True)

card("end", 5.0, None, "The system must prove what happened,\nnot merely say what it intended to do.",
     ["Legal Aid Navigator"], label="Closing", title_size=70, line_size=40)

# ═════════════════════════════ JOIN ═════════════════════════════
with open("concat.txt", "w", encoding="utf-8") as f:
    for p in parts:
        f.write(f"file '{p}'\n")
run(["-f", "concat", "-safe", "0", "-i", "concat.txt", "-c", "copy", "-movflags", "+faststart", OUT_MP4])


def ts(s, srt=False):
    h, m, sec = int(s // 3600), int(s % 3600 // 60), s % 60
    return (f"{h:02d}:{m:02d}:{sec:06.3f}".replace(".", ",") if srt else f"{h:d}:{m:02d}:{int(sec):02d}")


with open(os.path.join(SRC, "Legal_Aid_Navigator_Walkthrough_chapters.txt"), "w", encoding="utf-8") as f:
    f.write("CHAPTERS  (time in the finished video)\n\n")
    for label, a, b in timeline:
        f.write(f"{ts(a)}  {label}\n")
    f.write(f"\nTotal length: {ts(clock[0])}  ({clock[0]:.0f} s)\n")
with open(os.path.join(SRC, "Legal_Aid_Navigator_Walkthrough_captions.srt"), "w", encoding="utf-8") as f:
    for i, (a, b, t) in enumerate(captions, 1):
        f.write(f"{i}\n{ts(a, True)} --> {ts(b, True)}\n{t}\n\n")

print(f"DONE  {OUT_MP4}")
print(f"length {clock[0]:.1f}s  size {os.path.getsize(OUT_MP4) / 1048576:.1f} MB  segments {len(parts)}")
