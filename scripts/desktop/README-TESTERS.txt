IQRAFI — Read. Complete. Together.
Demo build for testers (Windows 10/11, 64-bit)
==============================================

HOW TO START
1. Extract the whole zip file (right-click > Extract All). Do not run it from inside the zip.
2. Open the IQRAFI-Demo folder and double-click IQRAFI.exe.
   - Windows may show "Windows protected your PC" because this test build is not signed.
     Click "More info" > "Run anyway".
   - Windows Firewall may ask about network access. Allow it if you want other people on
     the same Wi-Fi to join; otherwise you can cancel.
3. A black window opens. The first start takes about a minute while the demo data is
   prepared. Your browser then opens IQRAFI automatically.
4. Keep the black window open while testing. Close it to stop IQRAFI.

IF THE BROWSER DOES NOT OPEN
  Wait until the black window says "IQRAFI is running", then either
  - double-click "Open IQRAFI in browser" in the IQRAFI-Demo folder, or
  - open Chrome/Edge yourself and go to  http://127.0.0.1:3000
    (type the :3000 part — plain "localhost" opens Windows' own web server, IIS, if it is on)
  (If port 3000 was busy, the black window shows a different number, e.g. :3001.)
  If the black window shows an error, send the log file:
  %LOCALAPPDATA%\IQRAFI-Demo\iqrafi.log

DEMO ACCOUNTS (password for all: demo-password-123)
  ahmed@demo.iqrafi.com    owner of "Family Khatma" + admin dashboard (/admin)
  sara@demo.iqrafi.com
  ali@demo.iqrafi.com
  fatima@demo.iqrafi.com
  yusuf@demo.iqrafi.com
You can also create your own account.

THINGS TO TRY
  - Home: current Khatma (17/30 Juz), today's Juz, group progress
  - Read a Juz in the Qur'an reader; try text size, page colour and translation (the "T" button)
  - Mark a Juz complete
  - Groups > Create a Khatma, invite someone, "Assign Juz and begin"
  - Complete a Khatma and add a dedication
  - Discover: "The World Is Reading"
  - Switch language to Arabic or Urdu on the start page (before signing in) or in Settings
  - Use a private/incognito window to act as a second person

TESTING WITH OTHER PEOPLE
  Everything runs on the computer that started IQRAFI.exe. People on the same Wi-Fi can open
  the "Same Wi-Fi/network" address shown in the black window (e.g. http://192.168.1.20:3000),
  and invitation links created in the app use that address too.

START OVER
  Open a Command Prompt in the IQRAFI-Demo folder and run:   IQRAFI.exe --reset
  The demo data lives in %LOCALAPPDATA%\IQRAFI-Demo

This is a test build: the Qur'an text is from verified sources, but the demo users and their
activity are fictional and clearly labelled as demo data.
