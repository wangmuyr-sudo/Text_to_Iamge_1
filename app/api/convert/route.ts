import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import JSZip from 'jszip'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()

    const files = formData.getAll('files').filter((item): item is File => {
      return item instanceof File
    })

    const type = String(formData.get('type') || 'png')
    const dpi = Number(formData.get('dpi') || 72)

    if (files.length === 0) {
      return NextResponse.json(
        { error: '没有收到上传文件' },
        { status: 400 }
      )
    }

    const allowedTypes = ['png', 'jpg', 'jpeg', 'webp', 'tiff', 'cmyk']

    if (!allowedTypes.includes(type)) {
      return NextResponse.json(
        { error: `不支持的转换格式：${type}` },
        { status: 400 }
      )
    }

    const zip = new JSZip()
    const usedNames = new Map<string, number>()

    for (const file of files) {
      try {
        const arrayBuffer = await file.arrayBuffer()
        const inputBuffer = Buffer.from(arrayBuffer)

        const baseName = file.name.replace(/\.[^/.]+$/, '') || 'image'

        let outputBuffer: Buffer
        let ext = type

        const image = sharp(inputBuffer, {
          failOn: 'none',
        }).rotate()

        if (type === 'png') {
          outputBuffer = await image
            .withMetadata({ density: dpi })
            .png()
            .toBuffer()

          ext = 'png'
        } else if (type === 'jpg' || type === 'jpeg') {
          outputBuffer = await image
            .withMetadata({ density: dpi })
            .jpeg({ quality: 90 })
            .toBuffer()

          ext = 'jpg'
        } else if (type === 'webp') {
          outputBuffer = await image
            .withMetadata({ density: dpi })
            .webp({ quality: 85 })
            .toBuffer()

          ext = 'webp'
        } else if (type === 'tiff') {
          outputBuffer = await image
            .withMetadata({ density: dpi })
            .tiff()
            .toBuffer()

          ext = 'tiff'
        } else if (type === 'cmyk') {
          outputBuffer = await image
            .toColourspace('cmyk')
            .withMetadata({ density: dpi })
            .jpeg({ quality: 90 })
            .toBuffer()

          ext = 'jpg'
        } else {
          return NextResponse.json(
            { error: `不支持的转换格式：${type}` },
            { status: 400 }
          )
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
      } catch (error) {
        console.error(`处理文件失败：${file.name}`, error)

        return NextResponse.json(
          { error: `处理文件失败：${file.name}` },
          { status: 500 }
        )
      }
    }

    const zipBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: {
        level: 6,
      },
    })

    return new NextResponse(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="converted_files.zip"',
      },
    })
  } catch (error) {
    console.error('转换接口错误：', error)

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : '服务器内部错误',
      },
      { status: 500 }
    )
  }
}
