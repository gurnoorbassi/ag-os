# Mobile approval requests

Hashed, expiring, one-use approval request records live here. Plaintext decision tokens are never persisted. A GET request never changes state; the signed token must be submitted by POST for one exact job decision.
