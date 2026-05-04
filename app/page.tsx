'use client'

import { useEffect, useRef, useState } from 'react'

export default function Home() {
  const [images, setImages] = useState<string[]>([])
  const [files, setFiles] = useState<File[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [format, setFormat] = useState('png')
  const [dpi, setDpi] = useState('300')
  const [loading, setLoading] = useState(false)
  const [dragging, setDragging] = useState(false)

  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)

  const lastMousePosition = useRef({ x: 0, y: 0 })

  const resetViewer = () => {
    setScale(1)
    setPosition({ x: 0, y: 0 })
    setIsPanning(false)
  }

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
    setSelectedIndex(0)
    resetViewer()
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

  const handleSelectImage = (index: number) => {
    setSelectedIndex(index)
    resetViewer()
  }

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!images[selectedIndex]) return

    e.preventDefault()
    e.stopPropagation()

    setScale((prev) => {
      const nextScale = e.deltaY < 0 ? prev + 0.1 : prev - 0.1
      return Math.min(Math.max(nextScale, 0.1), 8)
    })
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!images[selectedIndex]) return

    e.preventDefault()
    e.stopPropagation()

    setIsPanning(true)

    lastMousePosition.current = {
      x: e.clientX,
      y: e.clientY,
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPanning) return

    e.preventDefault()
    e.stopPropagation()

    const dx = e.clientX - lastMousePosition.current.x
    const dy = e.clientY - lastMousePosition.current.y

    setPosition((prev) => ({
      x: prev.x + dx,
      y: prev.y + dy,
    }))

    lastMousePosition.current = {
      x: e.clientX,
      y: e.clientY,
    }
  }

  const stopPanning = () => {
    setIsPanning(false)
  }

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsPanning(false)
    }

    window.addEventListener('mouseup', handleGlobalMouseUp)

    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp)
    }
  }, [])

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

  const selectedImage = images[selectedIndex]
  const selectedFile = files[selectedIndex]

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
          className={`flex-1 flex flex-col overflow-hidden transition ${
            dragging
              ? 'bg-blue-50 border-2 border-dashed border-blue-500'
              : 'bg-gray-50'
          }`}
        >
          <div
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={stopPanning}
            onMouseLeave={stopPanning}
            onDoubleClick={resetViewer}
            className={`relative flex-1 overflow-hidden bg-gray-50 select-none ${
              selectedImage
                ? isPanning
                  ? 'cursor-grabbing'
                  : 'cursor-grab'
                : ''
            }`}
          >
            {selectedImage ? (
              <>
                <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
                  <img
                    src={selectedImage}
                    alt={selectedFile?.name || 'preview'}
                    draggable={false}
                    className="bg-white border shadow pointer-events-none"
                    style={{
                      maxWidth: 'none',
                      maxHeight: 'none',
                      width: 'auto',
                      height: 'auto',
                      transform: `translate3d(${position.x}px, ${position.y}px, 0) scale(${scale})`,
                      transformOrigin: 'center center',
                      willChange: 'transform',
                    }}
                  />
                </div>

                <div className="absolute right-4 top-4 bg-black/70 text-white text-xs px-3 py-1 rounded-full pointer-events-none">
                  {Math.round(scale * 100)}%
                </div>

                <div className="absolute left-4 bottom-4 bg-black/60 text-white text-xs px-3 py-2 rounded-lg pointer-events-none">
                  原始像素显示 · 滚轮缩放 · 拖动查看 · 双击重置
                </div>
              </>
            ) : (
              <div className="h-full flex items-center justify-center text-center text-gray-400">
                <div>
                  <div className="text-lg mb-2">拖拽图片到这里上传</div>
                  <div className="text-sm">或点击左侧 / 右侧上传按钮</div>
                </div>
              </div>
            )}
          </div>

          {images.length > 0 && (
            <div className="h-28 bg-white border-t px-4 py-3 overflow-x-auto">
              <div className="flex gap-3">
                {images.map((image, index) => (
                  <button
                    key={image}
                    onClick={() => handleSelectImage(index)}
                    className={`w-20 h-20 flex-shrink-0 rounded border overflow-hidden bg-gray-50 ${
                      selectedIndex === index
                        ? 'border-blue-600 ring-2 ring-blue-300'
                        : 'border-gray-200'
                    }`}
                  >
                    <img
                      src={image}
                      alt={`thumbnail-${index}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
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
                <button
                  key={`${file.name}-${index}`}
                  onClick={() => handleSelectImage(index)}
                  className={`block w-full text-left py-1 ${
                    selectedIndex === index
                      ? 'text-blue-600 font-medium'
                      : 'text-gray-600'
                  }`}
                >
                  {file.name}
                </button>
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