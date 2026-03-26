# Production Line Monitor — User Guide

This guide explains how to use the system for each role.

---

## Table of Contents

1. [Logging In](#1-logging-in)
2. [Dashboard — All Roles](#2-dashboard)
3. [Updating a Station Status — Operator+](#3-updating-a-station-status)
4. [Logging Maintenance — Line Technician+](#4-logging-maintenance)
5. [Troubleshooting Sessions — Line Technician+](#5-troubleshooting-sessions)
6. [Admin Panel — Admin Only](#6-admin-panel)
7. [Common Questions](#7-common-questions)

---

## 1. Logging In

1. Open a browser and go to `http://localhost` (or the IP/hostname your IT team provides)
2. Enter your username and password
3. Click **Log In**

If you see "Invalid credentials", check your username spelling or contact your admin to reset your password.

Your session stays active for 24 hours. After that, you will be redirected to the login page automatically.

---

## 2. Dashboard

The dashboard is the main screen. It shows all 52 tester stations in a grid.

### Reading a Station Card

Each card shows:
- **Tester name** (e.g. ETS-01, INVTG-03)
- **Handler** attached to it (e.g. JHT-A, MT-2)
- **Current status** — colour-coded:
  - 🟢 **Green** = Running
  - 🟠 **Orange** = Maintenance
  - 🔵 **Blue** = Engineering
  - 🔴 **Red** = Down
- **Time in current status** — live timer counting up

### Station Actions

Click any station card to open the action panel. What you see depends on your role:

| Action | Who can do it |
|--------|--------------|
| Change status | Operator and above |
| View status history | All roles |
| Open troubleshooting session | Line Technician and above |
| View troubleshooting history | All roles |
| Edit station details | Supervisor and above |

### Real-Time Updates

The dashboard updates automatically — you do not need to refresh the page. When any user on the floor changes a station's status, every connected screen updates within a second.

---

## 3. Updating a Station Status

1. Click the station card you want to update
2. Click **Change Status**
3. Select the new status (Running, Maintenance, Engineering, Down)
4. Optionally add a note explaining the change
5. Click **Confirm**

The card will update immediately on your screen and all other connected screens.

---

## 4. Logging Maintenance

> Requires: **Line Technician** role or above

When you start working on a tester:

1. Go to the **Maintenance** page (top navigation)
2. Click **Log Maintenance**
3. Select the tester, enter the start time and a brief description
4. Enter your name as the responsible technician
5. Click **Start**

When the work is done:

1. Find the open maintenance log for that tester
2. Click **Close**
3. Enter the end time and any final notes
4. Click **Confirm**

The duration is calculated automatically.

---

## 5. Troubleshooting Sessions

> Requires: **Line Technician** role or above

Use this when you are actively troubleshooting a fault — not just doing routine maintenance.

### Starting a Session

1. Click the tester's station card on the dashboard
2. Click **Troubleshoot**
3. Choose the session type:
   - **Upchuck** — a hard bin failure (test yield issue)
   - **Jamming** — a handler mechanical jam
4. Fill in the required fields:
   - *Upchuck:* Select the hard bin (HB04, HB08, HB12) and enter your name
   - *Jamming:* Describe the jam and enter your name
5. Click **Start Session**

### Adding Steps

Each step records one action you took and what happened:

1. Click **Add Step**
2. Select action tags from the list (e.g. "Clean Socket", "Swap Chuck") — you can select multiple
3. Describe the action in your own words (optional but recommended)
4. For **Upchuck** sessions, fill in the PC failure block:
   - Pin number, HB/SB observed, failure description
   - Measured value, upper and lower limits
   - How many sites failed and which site numbers
5. Enter the **Result** — what happened after this action
6. For **Jamming** sessions, enter the **Plan** — what you intend to try next
7. Click **Save Step**

Repeat for each action you take.

### Closing a Session

When the problem is resolved (or you are done for now):

1. Click **Close Session**
2. Choose **Solved** (problem fixed) or **Not Solved** (still ongoing or handed over)

A closed session cannot be reopened. If the problem returns, start a new session.

### Viewing Past Sessions

Click a station card → **Troubleshooting History** to see all past sessions for that tester.

On the **Maintenance** page, scroll down to see the full troubleshooting history list for all testers.

---

## 6. Admin Panel

> Requires: **Admin** role

### Managing Users

1. Go to **Admin** in the top navigation
2. Click **Users**
3. To create a new user: click **Add User**, fill in username, full name, password, and role
4. To deactivate a user: click the user's row → toggle **Active** off
5. To change a role: click the user's row → update the **Role** dropdown

### Viewing Audit Logs

1. Go to **Admin** → **Audit Logs**
2. Use the filters to search by user, action type, or date range
3. Each row shows: who did what, when, and from which IP address

Audit logs are permanent — they cannot be deleted.

---

## 7. Common Questions

**Q: The dashboard stopped updating in real time. What do I do?**
Refresh the page. If updates still don't appear, ask IT to check if the backend service is running.

**Q: I accidentally set the wrong status. Can I undo it?**
No — status changes cannot be undone (the history is permanent). Simply set the correct status now. The history will show both changes with their timestamps.

**Q: I can't open a troubleshooting session — it says "session already open".**
Another session is already open for this tester. Either close the existing session first, or ask the technician who opened it.

**Q: I forgot my password.**
Contact your admin. They can reset your password from the Admin panel.

**Q: The timer on a station card seems wrong.**
The timer shows how long the station has been in its *current* status. If the status was changed a while ago and you weren't watching, the timer may be large. This is correct.

**Q: Can I use this on my phone?**
The system is designed for desktop/laptop browsers or tablets. It may work on a phone, but the experience is not optimised for small screens yet.

**Q: Where can I see all the maintenance history for a specific tester?**
Go to the **Maintenance** page and filter by tester. All maintenance logs (open and closed) will appear.
