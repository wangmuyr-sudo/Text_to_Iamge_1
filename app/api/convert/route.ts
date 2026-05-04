import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import JSZip from 'jszip'

export const runtime = 'nodejs'

function isUploadedFile(item: FormDataEntryValue): item is File {
  return (
    typeof item === 'object' &&
    item !== null &&
    'arrayBuffer' in item &&
    'name' in item &&
    'type' in item
  )
}

const MAX_FILES = 5
const MAX_FILE_SIZE = 20 * 1024 * 1024

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const files = formData.getAll('files').filter(isUploadedFile)
    const type = String(formData.get('type') || 'png')
    const dpi = Number(formData.get('dpi') || 72)
    const quality = Math.max(10, Math.min(100, Number(formData.get('quality') || 90)))
    const rotate = Number(formData.get('rotate') || 0)
    const flipHorizontal = formData.get('flipHorizontal') === 'true'
    const flipVertical = formData.get('flipVertical') === 'true'

    if (files.length === 0) {
      return NextResponse.json({ error: '请上传图片' }, { status: 400 })
    }
    if (files.length > MAX_FILES) {
      return NextResponse.json({ error: `最多一次上传 ${MAX_FILES} 张` }, { status: 400 })
    }
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json({ error: '单张图片不能超过 20MB' }, { status: 400 })
      }
    }

    const allowedTypes = ['png', 'jpg', 'jpeg', 'webp', 'tiff', 'cmyk']
    if (!allowedTypes.includes(type)) {
      return NextResponse.json({ error: `不支持的格式：${type}` }, { status: 400 })
    }

    const zip = new JSZip()
    const usedNames = new Map<string, number>()
    const result = { success: 0, failed: 0, messages: [] as string[] }

    for (const file of files) {
      try {
        const arrayBuffer = await file.arrayBuffer()
        const inputBuffer = Buffer.from(arrayBuffer)
        const baseName = file.name.replace(/\.[^/.]+$/, '') || 'image'
        let outputBuffer: Buffer
        let ext = type

        let image = sharp(inputBuffer, { failOn: 'none' })

        // 编辑处理
        if (flipHorizontal) image = image.flop()
        if (flipVertical) image = image.flip()
        if (rotate > 0) image = image.rotate(rotate)

        if (type === 'png') {
          outputBuffer = await image.withMetadata({ density: dpi }).png({ quality }).toBuffer()
          ext = 'png'
        } else if (type === 'jpg' || type === 'jpeg') {
          outputBuffer = await image.withMetadata({ density: dpi }).jpeg({ quality }).toBuffer()
          ext = 'jpg'
        } else if (type === 'webp') {
          outputBuffer = await image.withMetadata({ density: dpi }).webp({ quality }).toBuffer()
          ext = 'webp'
        } else if (type === 'tiff') {
          outputBuffer = await image.withMetadata({ density: dpi }).tiff({ quality }).toBuffer()
          ext = 'tiff'
        } else if (type === 'cmyk') {
          outputBuffer = await image.toColourspace('cmyk').withMetadata({ density: dpi }).jpeg({ quality }).toBuffer()
          ext = 'jpg'
        } else {
          throw new Error('不支持的格式')
        }

        let fileName = `${baseName}.${ext}`
        if (usedNames.has(fileName)) {
          const count = usedNames.get(fileName)! + 1
          usedNames.set(fileName, count)
          fileName = `${baseName}-${count}.${ext}`
        } else {
          usedNames.set(fileName, 1)
        }

        zip.file(fileName, outputBuffer)
        result.success++
      } catch (err) {
        result.failed++
        result.messages.push(`${file.name}: ${err instanceof Error ? err.message : '处理失败'}`)
        continue
      }
    }

    if (result.success === 0) {
      return NextResponse.json({ error: '所有图片处理失败', details: result.messages }, { status: 400 })
    }

    const zipBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    })

    return new NextResponse(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="converted_files.zip"',
      },
    })
  } catch (error) {
    console.error('转换错误：', error)
    return NextResponse.json({
      error: '服务器处理失败',
      detail: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 })
  }
}
