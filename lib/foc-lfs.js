
import assert from 'node:assert/strict'
import * as Name from 'w3name'

const createSplitter = synapse => {
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
        console.log(`Pieces: ${uploadPromises.length}`)
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

const publishLfs = async pieceCids => {
  const name = await Name.create()
  const value = `/${pieceCids.join(',')}`
  const revision = await Name.v0(name, value)
  // Note: revisions live for 1 year after creation by default.
  await Name.publish(revision, name.key)
  return name.toString()
}

export const uploadLfs = async (synapse, data) => {
  const { splitter, uploadPromises } = createSplitter(synapse)
  await data.pipeTo(splitter)
  const uploadResults = await Promise.all(uploadPromises)
  const uploadKey = await publishLfs(uploadResults.map(({ pieceCid }) => pieceCid))
  return {
    uploadKey,
    uploadResults
  }
}

export const downloadLfs = async (synapse, uploadKey) => {
  const name = Name.parse(uploadKey)
  const revision = await Name.resolve(name)
  const pieceCids = revision.value.slice(1).split(',')

  let i = 0
  return new ReadableStream({
    async pull (controller) {
      if (!pieceCids[i]) {
        return controller.close()
      }
      controller.enqueue(
        await synapse.storage.download({
          pieceCid: pieceCids[i++]
        })
      )
    }
  })
}