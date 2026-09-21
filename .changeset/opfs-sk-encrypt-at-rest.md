---
"quantum-resistant-rustykey": minor
---

Make browser keygen/sign for all four signature families require WebAuthn UV + PRF + the OPFS encrypted-sk wallet. Node and REST loaders stay unconstrained. Registration uses `prf: {}`; eval runs only on get().
