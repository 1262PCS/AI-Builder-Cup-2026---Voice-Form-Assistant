# Security Specification & Threat Model: VoxForm AI

## 1. Data Invariants
1. Users may only read, create, and update their own user document under `/users/{userId}` where `request.auth.uid == userId`.
2. A user cannot overwrite another user's voice profile, autofill data, or reading sessions.
3. All sessions `/users/{userId}/sessions/{sessionId}` must have `incoming().userId == request.auth.uid`.
4. Form fills `/users/{userId}/formFills/{formFillId}` must be strictly owned by `request.auth.uid`.
5. Timestamps must be validated: `createdAt == request.time`.
6. String sizes must be bounded (`<= 512` characters for URLs, prompts, and verified values).
7. Default-deny catch-all rule protects all unmapped collections.

## 2. The "Dirty Dozen" Attack Payloads (Tested to Deny)
1. **Unauthenticated Read**: Attempting to read `/users/victim_123` with `request.auth = null`. (Denied)
2. **Cross-Tenant User Profile Hijack**: Attacker `uid: attacker_456` attempting to overwrite `/users/victim_123`. (Denied)
3. **Session Spoofing**: User `uid: user_1` attempting to insert a session into `/users/user_2/sessions/sess_1`. (Denied)
4. **OwnerId Tampering on Update**: Trying to alter `userId` on existing session. (Denied)
5. **Denial-of-Wallet Payload**: Trying to write a 2MB string into `verifiedValue` or `pageUrl`. (Denied)
6. **ID Injection Attack**: Using invalid characters or malicious paths in `{sessionId}` or `{formFillId}`. (Denied)
7. **Client-Forged Timestamp**: Injecting fake future `createdAt` timestamps instead of `request.time`. (Denied)
8. **Shadow Field Injection**: Attempting to inject `isAdmin: true` into `users/{userId}`. (Denied)
9. **Unauthenticated List Query**: Scraping all users via collectionGroup or `/users`. (Denied)
10. **State Corruption**: Deleting another user's form fill history. (Denied)
11. **Malicious Protocol Injection**: Inserting binary or malformed data into `fieldLabel`. (Denied)
12. **Custom Rule Impersonation**: Attacker adding a malicious site rule into another user's rulebook. (Denied)
