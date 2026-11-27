"""First-come-first-served slots for the review's render, cpu and voice queues.

    python3 -I fifo.py <kind> <slots> <command...>

Takes a ticket (arrival time), waits until it is the oldest live ticket, then
takes the first free slot lock (<dir>/<kind><i>.lock, the same files the
earlier unordered queue scripts lock, so the two exclude each other) and
execs the command holding it: the lock is an inherited file descriptor, so it
is held exactly as long as the command runs.

The first queue scripts were unordered (whoever polled first after a slot
freed got it), and with twenty reviewers on two render slots some jobs
waited past their two-hour limit and were killed. Jobs still waiting under
those scripts arrived before any job here, so a ticket also waits while any
of them is still waiting.
"""
import fcntl
import os
import sys
import time

D = "/tmp/claude-0/-home-user-dataslope/a7697946-07dc-5861-b60b-4725a18149d6/scratchpad/slots"
kind, slots, cmd = sys.argv[1], int(sys.argv[2]), sys.argv[3:]
Q = os.path.join(D, f"{kind}-queue")
os.makedirs(Q, exist_ok=True)
me = f"{time.time_ns()}.{os.getpid()}"
ticket = os.path.join(Q, me)
open(ticket, "w").close()
script = f"out/{kind}-slot.sh".encode()


def alive(pid):
    try:
        os.kill(pid, 0)
        return True
    except OSError:
        return False


def procs():
    """pid -> (ppid, argv, comm) for every process."""
    out = {}
    for p in os.listdir("/proc"):
        if not p.isdigit():
            continue
        try:
            argv = open(f"/proc/{p}/cmdline", "rb").read().split(b"\0")
            stat = open(f"/proc/{p}/stat").read()
            comm = stat[stat.index("(") + 1 : stat.rindex(")")]
            ppid = int(stat[stat.rindex(")") + 2 :].split()[1])
        except (OSError, ValueError):
            continue
        out[int(p)] = (ppid, argv, comm)
    return out


def old_waiting():
    """True while a job under the old unordered script is still waiting."""
    ps = procs()
    kids = {}
    for pid, (ppid, _, comm) in ps.items():
        kids.setdefault(ppid, []).append(comm)
    for pid, (ppid, argv, _) in ps.items():
        if len(argv) < 2 or not argv[0].endswith(b"bash") or argv[1] != script:
            continue
        parent = ps.get(ppid)
        if parent and len(parent[1]) > 1 and parent[1][1] == script:
            continue  # a subshell of a slot script, not a job
        if all(c == "sleep" for c in kids.get(pid, [])):
            return True  # polling: only ever a sleep under it
    return False


def head():
    live = []
    for t in os.listdir(Q):
        try:
            ts, pid = t.split(".")
            pid = int(pid)
        except ValueError:
            continue
        if alive(pid):
            live.append((int(ts), t))
        else:
            try:
                os.remove(os.path.join(Q, t))
            except OSError:
                pass
    live.sort()
    return live[0][1] if live else None


try:
    while True:
        if head() == me and not old_waiting():
            for i in range(1, slots + 1):
                fd = os.open(os.path.join(D, f"{kind}{i}.lock"), os.O_WRONLY | os.O_CREAT, 0o644)
                try:
                    fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
                except BlockingIOError:
                    os.close(fd)
                    continue
                os.remove(ticket)
                os.set_inheritable(fd, True)
                os.execvp(cmd[0], cmd)
        time.sleep(2)
finally:
    try:
        os.remove(ticket)
    except OSError:
        pass
