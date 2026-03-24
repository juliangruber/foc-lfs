
import { Synapse } from '@filoz/synapse-sdk'
import { privateKeyToAccount } from 'viem/accounts'
import bytes from 'bytes'
import { uploadLfs, downloadLfs } from './lib/foc-lfs.js'
import { createRandomBytesStream } from './lib/random.js'

const {
  PRIVATE_KEY,
  SIZE = '1MB'
} = process.env

const synapse = Synapse.create({
  account: privateKeyToAccount(PRIVATE_KEY),
  source: 'foc-lfs'
})

// console.log('checking funding...')
// const prep = await synapse.storage.prepare({
//   dataSize: BigInt(totalBytes),
// })
// if (prep.transaction) {
//   console.log('funding account...')
//   const { hash } = await prep.transaction.execute()
//   console.log(`Account funded and approved (tx: ${hash})`)
// }

console.log(`Uploading ${SIZE}...`)
const startUpload = new Date()

const { uploadKey, uploadResults } = await uploadLfs(
  synapse,
  createRandomBytesStream(bytes(SIZE))
)

console.log(`Upload took ${Math.floor((new Date() - startUpload)/1000/60)} minutes`)
console.log()
console.log(`UploadKey: ${uploadKey}`)
console.log('PieceCIDs:')
for (const { pieceCid } of uploadResults) {
  console.log(`- ${pieceCid}`)
}
console.log()

console.log(`Downloading ${uploadKey}...`)
const startDownload = new Date()

const downloadStream = await downloadLfs(synapse, uploadKey)
await downloadStream.pipeTo(new WritableStream())

console.log(`Download took ${Math.floor((new Date() - startDownload) / 1000)} seconds`)

console.log('Deleting...')
const startDelete = new Date()

await deleteLfs(synapse, uploadKey)

console.log(`Deletion took ${Math.floor((new Date() - startDelete) / 1000)} seconds`)
