import type { HttpRequest, HttpResponse } from 'uWebSockets.js'
import { randomUUIDv7 } from 'node:crypto'
import type { AuthenticationExtensionsClientInputs } from '@simplewebauthn/server'
import { generateRegistrationOptions } from '@simplewebauthn/server'
// import { generateSlug } from 'random-word-slugs'
import { WEBAUTHN_TTL_SECONDS } from '../../../constants/max-age'
import { logger } from '../../utils/logtape'
import { pgstFetch } from '../../utils/pgstFetch'
import { resolveRpConfig } from './originsFromHostname'

// import { twoBytesHourlyInc } from './twoBytesHourlyInc'

const RP_NAME = 'RustyKey® Sovereign Systems'

const textEncoder = new TextEncoder()

// function uint8ArrayToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
//   if (bytes.buffer instanceof SharedArrayBuffer) {
//     throw new TypeError('SharedArrayBuffer is not supported for WebAuthn PRF extensions')
//   }
//   return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
// }

export async function registerOptions(res: HttpResponse, req: HttpRequest): Promise<void> {
  res.onAborted(() => {
    res.aborted = true
    logger.warn('⚠️ WebAuthn registerOptions request aborted by client connection drop.')
  })

  const IS_DEV = process.env.NODE_ENV !== 'production'

  try {
    // const displayname_prefix = generateSlug()
    // const twoBytesSuffix = twoBytesHourlyInc()
    // const displayname_suffix = twoBytesSuffix.toBase64({ alphabet: 'base64url', omitPadding: true })
    // const userName = `${displayname_prefix}-${displayname_suffix}`
    // const userDisplayName = userName
    const userName = 'did:webauthn:rustykey.me'
    const userDisplayName = userName
    logger.info('userName AND displayName: {userName}', { userName })

    const prfSalt = crypto.getRandomValues(new Uint8Array(32))
    const prfSaltBase64URL = prfSalt.toBase64({ alphabet: 'base64url', omitPadding: true })

    const prfSaltHex = `\\x${prfSalt.toHex()}`
    const origin = req.getHeader('origin')
    const hostHeader = req.getHeader('host')
    const { rpId } = resolveRpConfig(IS_DEV ? new URL(origin).hostname : hostHeader)

    const extensions: AuthenticationExtensionsClientInputs = {
      prf: {},
    }
    logger.debug('registerOptions.ts hostHeader: {rpId}', { rpId })

    const userID = randomUUIDv7()
    // Salt stays a companion field. eval on create() breaks Safari silently
    // and loops Chrome into new passkey registrations.
    const options = await generateRegistrationOptions({
      rpName: RP_NAME,
      rpID: rpId,
      userID: textEncoder.encode(userID),
      userName,
      userDisplayName,
      extensions,
      supportedAlgorithmIDs: [-8, -7],

      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        residentKey: 'required',
        requireResidentKey: true,
        userVerification: 'required',
      },
      attestationType: 'none',
    })

    // 2. Keep RP options as prf: {} even if the library injects eval.
    ;(options as { extensions?: { prf?: Record<string, unknown> } }).extensions = {
      prf: {},
    }

    const expiresAt = new Date(Date.now() + WEBAUTHN_TTL_SECONDS * 1000).toISOString()

    logger.debug(
      '💾 Committing transient registerOptions challenge lease parameters to PostgreSQL storage...',
    )

    const pathquery = 'webauthn_challenge'
    const pgstPayload = {
      rpid: rpId,
      user_id: userID,
      challenge_token: options.challenge,
      registration_options: options,
      expires_at: expiresAt,
      prf_salt: prfSaltHex,
    }

    const pgstRes = await pgstFetch(pathquery, {
      method: 'POST',
      body: JSON.stringify(pgstPayload),
    })

    logger.info('PostgREST Write Status: {statusMarker} {path} => {code} {text}', {
      statusMarker: pgstRes.ok ? '✅' : '❌',
      path: pathquery,
      code: pgstRes.status,
      text: pgstRes.statusText,
    })

    if (!pgstRes.ok) {
      const errText = await pgstRes.text()
      logger.error('🚨 PostgREST registerOptions Challenge Write Failure Payload: {err}', {
        err: errText,
      })
      throw new Error(
        `Database rejected option lease storage layout string parameters. Status: ${pgstRes.status}`,
      )
    }

    if (res.aborted) return

    res.cork(() => {
      logger.info('✅ Successfully dispatched Level 3 registerOptions payload to client.')

      res
        .writeStatus('200 OK')
        .writeHeader('content-type', 'application/json')
        .end(JSON.stringify({ ...options, prfSalt: prfSaltBase64URL }))
    })
  } catch (error) {
    logger.error('💥 WebAuthn registerOptions Generation Pipeline Aborted: {error}', {
      error: String(error),
    })

    if (res.aborted) return
    res.cork(() => {
      res
        .writeStatus('500 Internal Server Error')
        .end(JSON.stringify({ error: 'Failed to generate WebAuthn registerOptions.' }))
    })
  }
}
