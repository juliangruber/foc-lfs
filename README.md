# foc-lfs
Large File Storage on FOC.

Streaming large file upload and download using Synapse SDK.

## Usage

```
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

await downloadLfs(synapse, uploadKey)
```
