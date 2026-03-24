import bytes from 'bytes'

const chunkSizeBytes = bytes('1KB')

export const createRandomBytesStream = totalBytes => {
  let bytesSent = 0
  return new ReadableStream({
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
}
