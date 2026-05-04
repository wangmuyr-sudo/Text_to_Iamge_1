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

// 安全限制配置
const MAX_FILES = 5 // 最多5张
const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20MB

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const files = formData.getAll('files').filter(isUploadedFile)
    const type = String(formData.get('type') || 'png')
    const dpi = Number(formData.get('dpi') || 72)

    // ========== 安全校验 ==========
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

    // ========== 批量处理（失败不中断） ==========
    for (const file of files) {
      try {
        const arrayBuffer = await file.arrayBuffer()
        const inputBuffer = Buffer.from(arrayBuffer)
        const baseName = file.name.replace(/\.[^/.]+$/, '') || 'image'
        let outputBuffer: Buffer
        let ext = type

        const image = sharp(inputBuffer, { failOn: 'none' }).rotate()

        if (type === 'png') {
          outputBuffer = await image.withMetadata({ density: dpi }).png().toBuffer()
          ext = 'png'
        } else if (type === 'jpg' || type === 'jpeg') {
          outputBuffer = await image.withMetadata({ density: dpi }).jpeg({ quality: 90 }).toBuffer()
          ext = 'jpg'
        } else if (type === 'webp') {
          outputBuffer = await image.withMetadata({ density: dpi }).webp({ quality: 85 }).toBuffer()
          ext = 'webp'
        } else if (type === 'tiff') {
          outputBuffer = await image.withMetadata({ density: dpi }).tiff().toBuffer()
          ext = 'tiff'
        } else if (type === 'cmyk') {
          outputBuffer = await image.toColourspace('cmyk').withMetadata({ density: dpi }).jpeg({ quality: 90 }).toBuffer()
          ext = 'jpg'
        } else {
          throw new Error('不支持的格式')
        }

        // 重名处理
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
        const msg = err instanceof Error ? err.message : '处理失败'
        result.messages.push(`${file.name} => ${msg}`)
        continue // 🔥 关键：跳过，继续处理下一张
      }
    }

    // 无成功文件
    if (result.success === 0) {
      return NextResponse.json({
        error: '所有图片处理失败',
        details: result.messages
      }, { status: 400 })
    }

    // 生成 ZIP
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
