'use client'

import { useEffect, useState } from 'react'

export default function Home() {
  const [images, setImages] = useState<string[]>([])
  const [files, setFiles] = useState<File[]>([])
  const [format, setFormat] = useState('png')
  const [dpi, setDpi] = useState('300')
  const [loading, setLoading] = useState(false)
  const [dragging, setDragging] = useState(false)

  const updateFiles = (selectedFiles: File[]) => {
    const imageFiles = selectedFiles.filter((file) =>
      file.type.startsWith('image/')
    )

    if (imageFiles.length === 0) {
      alert('请上传图片文件')
      return
    }

    images.forEach((url) => URL.revokeObjectURL(url))

    setFiles(imageFiles)
    setImages(imageFiles.map((file) => URL.createObjectURL(file)))
  }

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    updateFiles(selectedFiles)
    e.target.value = ''
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragging(false)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragging(false)

    const droppedFiles = Array.from(e.dataTransfer.files || [])
    updateFiles(droppedFiles)
  }

  useEffect(() => {
    return () => {
      images.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [images])

  const handleConvert = async () => {
    if (files.length === 0) {
      alert('请先上传图片')
      return
    }

    setLoading(true)

    try {
      const formData = new FormData()

      files.forEach((file) => {
        formData.append('files', file)
      })

      formData.append('type', format)
      formData.append('dpi', dpi)

      const res = await fetch('/api/convert', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        let message = '转换失败，请稍后重试'

        try {
          const data = await res.json()
          message = data.error || message
        } catch {
          try {
            const text = await res.text()
            if (text) message = text
          } catch {}
        }

        if (res.status === 400) {
          alert(`参数错误：${message}`)
        } else if (res.status === 413) {
          alert('上传文件过大，请减少图片数量或压缩后再试')
        } else if (res.status === 500) {
          alert(`服务器处理失败：${message}`)
        } else {
          alert(`转换失败：${message}`)
        }

        return
      }

      const blob = await res.blob()

      if (blob.size === 0) {
        alert('转换失败：下载文件为空')
        return
      }

      const url = URL.createObjectURL(blob)

      const a = document.createElement('a')
      a.href = url
      a.download = 'converted_files.zip'
      document.body.appendChild(a)
      a.click()
      a.remove()

      URL.revokeObjectURL(url)
    } catch (error) {
      console.error(error)

      if (error instanceof TypeError) {
        alert('请求失败：无法连接到转换接口，请检查后端服务是否正常运行')
      } else {
        alert('转换过程中发生未知错误')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      <div className="h-14 bg-yellow-400 flex items-center justify-between px-5 border-b">
        <div className="font-bold text-lg">AI 图片转换工具</div>
        <button className="bg-black text-white px-5 py-2 rounded-lg">
          保存
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-16 bg-white border-r flex flex-col items-center py-4 gap-4">
          <label className="text-sm cursor-pointer">
            上传
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleUpload}
              className="hidden"
            />
          </label>

          <button className="text-sm">裁剪</button>
          <button className="text-sm">旋转</button>
          <button className="text-sm">翻转</button>
        </div>

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`flex-1 flex items-center justify-center overflow-auto p-6 transition ${
            dragging
              ? 'bg-blue-50 border-2 border-dashed border-blue-500'
              : 'bg-gray-50'
          }`}
        >
          {images.length > 0 ? (
            <div className="flex flex-wrap gap-4">
              {images.map((image, index) => (
                <img
                  key={image}
                  src={image}
                  alt={`preview-${index}`}
                  className="max-w-[150px] max-h-[150px] border shadow bg-white object-contain"
                />
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-400">
              <div className="text-lg mb-2">拖拽图片到这里上传</div>
              <div className="text-sm">或点击左侧 / 右侧上传按钮</div>
            </div>
          )}
        </div>

        <div className="w-80 bg-white border-l p-5">
          <h2 className="font-bold text-lg mb-4">转换设置</h2>

          <label className="block w-full bg-gray-900 text-white text-center py-3 rounded-lg cursor-pointer">
            上传图片
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleUpload}
              className="hidden"
            />
          </label>

          {files.length > 0 && (
            <div className="mt-3 text-sm text-gray-600 break-all">
              <div className="mb-1">当前文件：{files.length} 个</div>
              {files.map((file, index) => (
                <div key={`${file.name}-${index}`}>{file.name}</div>
              ))}
            </div>
          )}

          <div className="mt-5">
            <label className="block mb-1 text-sm">转换类型</label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              className="w-full border rounded p-2"
            >
              <option value="png">PNG</option>
              <option value="jpg">JPG</option>
              <option value="webp">WEBP</option>
              <option value="tiff">TIFF</option>
              <option value="cmyk">CMYK JPG</option>
            </select>
          </div>

          <div className="mt-5">
            <label className="block mb-1 text-sm">DPI</label>
            <select
              value={dpi}
              onChange={(e) => setDpi(e.target.value)}
              className="w-full border rounded p-2"
            >
              <option value="72">72</option>
              <option value="150">150</option>
              <option value="300">300</option>
            </select>
          </div>

          <button
            onClick={handleConvert}
            disabled={loading}
            className="mt-6 w-full bg-blue-600 disabled:bg-gray-400 text-white py-3 rounded-lg"
          >
            {loading ? '转换中...' : '开始转换'}
          </button>
        </div>
      </div>
    </div>
  )
}