# foc-lfs
Large File Storage on FOC.

Streaming large file upload and download using Synapse SDK.

## Usage

```js
import { uploadLfs, downloadLfs } from './lib/foc-lfs.js'
import { createRandomBytesStream } from './lib/random.js'

const { uploadKey, uploadResults } = await uploadLfs(
  synapse,
  createRandomBytesStream(1024 * 1024 * 1024 * 1024 * 2)
)

console.log(`UploadKey: ${uploadKey}`)
console.log('PieceCIDs:')
for (const { pieceCid } of uploadResults) {
  console.log(`- ${pieceCid}`)
}

await downloadLfs(synapse, uploadKey) // returns readable stream
await deleteLfs(synapse, uploadKey)
```

## How it works

- The upload stream is chunked according to piece size limits
- For each chunk, one piece is stored
- The list of piece Cids is published to IPNS, resulting in an `uploadKey`
- For download given `uploadKey`, the process is reversed
