# Medi

**Your personal medical wallet.**

Medi is a mobile application that lets you store and organize your medical records in one place. You can search for a doctor of your choosing and allow them to view your records and summaries. You choose which records and summaries to show or hide from each doctor, so no information is shared without your consent.

From your records, you can generate medical summaries (SOAP note, Medical Report, or Referral Letter) to bring to doctor appointments, giving doctors the context they need to make more informed decisions.

---

## User Types

A single account can cover all four user types. You can switch between them from the Profile tab under Account.

### Independent Users
Manage your own records. Upload medical records with a chief complaint so your records carry context. Generate summaries to share with doctors. Ask Medi AI to explain anything unclear in your records. Answers are tailored to your case, not generic. Grant doctors access to your records and/or summaries.

### Guardians & Dependents
Manage someone else's records. Records, summaries, AI chats, and doctor access are kept completely separate per dependent. Generate summaries from a dependent's records to share with their doctors. Grant doctors access per dependent. If a phone number is added for a dependent, they can log into their own home page using that number and the guardian's password. Dependent users have a simplified experience: they can chat with Medi AI, and request one-hour access to view their records and summaries upon their guardian's approval and a shortcut to call their guardian.

### Doctors
Receive access requests from patients via the notification center and choose to accept or decline. View accepted patients' records and summaries based on what each patient has chosen to share. Remove patients from your list at any time. Doctor accounts require a valid medical licence and are subject to monthly verification.

---

## Tech Stack

- React Native (Expo)
- React Navigation
- Expo ImagePicker, DocumentPicker, LinearGradient
- i18next (EN, AR, FR)
- Axios
