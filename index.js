
import { Synapse } from '@filoz/synapse-sdk'
import { privateKeyToAccount } from 'viem/accounts'
import bytes from 'bytes'

const {
  PRIVATE_KEY,
  SIZE = '1MB'
} = process.env

const synapse = Synapse.create({
  account: privateKeyToAccount(PRIVATE_KEY),
  source: 'foc-lfs'
})

const totalBytes = bytes(SIZE)

let bytesSent = 0
const chunkSizeBytes = 65536
const stream = new ReadableStream({
  pull (controller) {
    const remaining = totalBytes - bytesSent
      
    if (remaining <= 0) {
      return controller.close()
    }

    const currentChunkSize = Math.min(remaining, chunkSizeBytes)
    const chunk = new Uint8Array(currentChunkSize)

    for (let i = 0; i < currentChunkSize; i++) {
      chunk[i] = Math.floor(Math.random() * 256)
    }

    controller.enqueue(chunk)
    bytesSent += currentChunkSize
  }
})

// console.log('checking funding...')
// const prep = await synapse.storage.prepare({
//   dataSize: BigInt(totalBytes),
// })
// if (prep.transaction) {
//   console.log('funding account...')
//   const { hash } = await prep.transaction.execute()
//   console.log(`✅ Account funded and approved (tx: ${hash})`)
// }

const startUpload = new Date()
console.log(`uploading ${SIZE}...`)
const { pieceCid, size, complete, copies, failedAttempts } = await synapse.storage.upload(stream)
console.log(`PieceCID: ${pieceCid}`)
console.log(`Size: ${size} bytes`)
console.log(`Stored on ${copies.length} providers`)
if (!complete) console.warn(`${failedAttempts.length} copy attempt(s) failed`)
console.log(`Upload took ${Math.floor((new Date() - startUpload)/1000/60)} minutes`)

const startDownload = new Date()
console.log('downloading...')
await synapse.storage.download({ pieceCid })
console.log(`✅ Download successful!`)
console.log(`download took ${Math.floor((new Date() - startDownload) / 1000 / 60)} minutes`)
