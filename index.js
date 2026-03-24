
import { Synapse } from '@filoz/synapse-sdk'
import { privateKeyToAccount } from 'viem/accounts'
import bytes from 'bytes'
import assert from 'node:assert/strict'

const {
  PRIVATE_KEY,
  SIZE = '1MB'
} = process.env

const synapse = Synapse.create({
  account: privateKeyToAccount(PRIVATE_KEY),
  source: 'foc-lfs'
})

const totalBytes = bytes(SIZE)

const startUpload = new Date()
console.log(`uploading ${SIZE}...`)

let bytesSent = 0
const chunkSizeBytes = bytes('1KB')
const source = new ReadableStream({
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

const createSplitter = () => {
  let currentUploadStream
  let currentWriter
  let currentBytesWritten = 0
  const uploadSizeLimit = 1065353216
  // const uploadSizeLimit = bytes('1MB')
  const uploadPromises = []

  const splitter = new WritableStream({
    async write (chunk) {
      // FIXME
      assert(chunk.length < uploadSizeLimit)
      currentBytesWritten += chunk.length

      if (currentBytesWritten >= uploadSizeLimit) {
        currentWriter.releaseLock()
        await currentUploadStream.writable.close()
        currentUploadStream = null
      }

      if (!currentUploadStream) {
        currentBytesWritten = chunk.length
        currentUploadStream = new TransformStream()
        currentWriter = currentUploadStream.writable.getWriter()
        uploadPromises.push(synapse.storage.upload(currentUploadStream.readable))
        console.log(`pieces: ${uploadPromises.length}`)
      }

      await currentWriter.write(chunk)
    },

    async close () {
      // TODO: This assumes at least one chunk
      currentWriter.releaseLock()
      await currentUploadStream.writable.close()
    }
  })

  return { splitter, uploadPromises }
}

const uploadLfs = async data => {
  const { splitter, uploadPromises } = createSplitter(data)
  await data.pipeTo(splitter)
  const uploadResults = await Promise.all(uploadPromises)
  return uploadResults
}

const uploadResults = await uploadLfs(source)
console.log('PieceCIDs:')
for (const { pieceCid } of uploadResults) {
  console.log(`- ${pieceCid}`)
}
console.log(`Upload took ${Math.floor((new Date() - startUpload)/1000/60)} minutes`)
