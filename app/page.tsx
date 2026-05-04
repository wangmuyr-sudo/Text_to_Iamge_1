'use client'

import { useEffect, useRef, useState } from 'react'

export default function Home() {
  const [images, setImages] = useState<string[]>([])
  const [files, setFiles] = useState<File[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [format, setFormat] = useState('png')
  const [dpi, setDpi] = useState('300')
  const [quality, setQuality] = useState(90)
  const [loading, setLoading] = useState(false)
  const [dragging, setDragging] = useState(false)

  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const lastMousePosition = useRef({ x: 0, y: 0 })

  // 编辑状态
  const [rotate, setRotate] = useState(0)
  const [flipHorizontal, setFlipHorizontal] = useState(false)
  const [flipVertical, setFlipVertical] = useState(false)

  const MAX_FILES = 5
  const MAX_SIZE = 20 * 1024 * 1024

  const resetViewer = () => {
    setScale(1)
    setPosition({ x: 0, y: 0 })
    setIsPanning(false)
  }

  const resetEdit = () => {
    setRotate(0)
    setFlipHorizontal(false)
    setFlipVertical(false)
  }

  const updateFiles = (selectedFiles: File[]) => {
    const imageFiles = selectedFiles.filter(f => f.type.startsWith('image/'))
    if (imageFiles.length > MAX_FILES) {
      alert(`最多上传 ${MAX_FILES} 张图片`)
      return
    }
    const tooBig = imageFiles.find(f => f.size > MAX_SIZE)
    if (tooBig) {
      alert('单张图片不能超过 20MB')
      return
    }
    if (imageFiles.length === 0) {
      alert('请上传有效的图片文件')
      return
    }

    images.forEach(url => URL.revokeObjectURL(url))
    setFiles(imageFiles)
    setImages(imageFiles.map(file => URL.createObjectURL(file)))
    setSelectedIndex(0)
    resetViewer()
    resetEdit()
  }

  const handleDelete = (index: number) => {
    const newImages = [...images]
    const newFiles = [...files]
    URL.revokeObjectURL(newImages[index])
    newImages.splice(index, 1)
    newFiles.splice(index, 1)
    setImages(newImages)
    setFiles(newFiles)

    if (newImages.length === 0) {
      setSelectedIndex(0)
      resetEdit()
    } else if (selectedIndex === index) {
      setSelectedIndex(Math.max(0, index - 1))
    } else if (selectedIndex > index) {
      setSelectedIndex(selectedIndex - 1)
    }
    resetViewer()
  }

  const handleClearAll = () => {
    if (files.length === 0) return
    if (!confirm('确定要清空所有图片吗？')) return
    images.forEach(url => URL.revokeObjectURL(url))
    setImages([])
    setFiles([])
    setSelectedIndex(0)
    resetViewer()
    resetEdit()
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
    setScale(prev => {
      const next = e.deltaY < 0 ? prev + 0.1 : prev - 0.1
      return Math.min(Math.max(next, 0.1), 8)
    })
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!images[selectedIndex]) return
    e.preventDefault()
    setIsPanning(true)
    lastMousePosition.current = { x: e.clientX, y: e.clientY }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPanning) return
    e.preventDefault()
    const dx = e.clientX - lastMousePosition.current.x
    const dy = e.clientY - lastMousePosition.current.y
    setPosition(prev => ({ x: prev.x + dx, y: prev.y + dy }))
    lastMousePosition.current = { x: e.clientX, y: e.clientY }
  }

  const stopPanning = () => setIsPanning(false)

  useEffect(() => {
    const up = () => setIsPanning(false)
    window.addEventListener('mouseup', up)
    return () => window.removeEventListener('mouseup', up)
  }, [])

  useEffect(() => {
    return () => images.forEach(url => URL.revokeObjectURL(url))
  }, [images])

  // === 🔥 编辑功能：旋转 / 翻转 ===
  const handleRotate = () => {
    setRotate(prev => (prev + 90) % 360)
  }

  const handleFlipHorizontal = () => {
    setFlipHorizontal(prev => !prev)
  }

  const handleFlipVertical = () => {
    setFlipVertical(prev => !prev)
  }

  // === 🔥 转换提交 ===
  const handleConvert = async () => {
    if (files.length === 0) {
      alert('请先上传图片')
      return
    }

    setLoading(true)
    try {
      const formData = new FormData()
      files.forEach(file => formData.append('files', file))
      formData.append('type', format)
      formData.append('dpi', dpi)
      formData.append('quality', String(quality))
      formData.append('rotate', String(rotate))
      formData.append('flipHorizontal', String(flipHorizontal))
      formData.append('flipVertical', String(flipVertical))

      const res = await fetch('/api/convert', {
        method: 'POST',
        body: formData
      })

      if (!res.ok) {
        let msg = '转换失败'
        try {
          const data = await res.json()
          msg = data.error || msg
        } catch {}
        alert(msg)
        return
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'converted_files.zip'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      alert('转换出错，请重试')
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
        <button className="bg-black text-white px-5 py-2 rounded-lg">保存</button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-16 bg-white border-r flex flex-col items-center py-4 gap-4">
          <label className="text-sm cursor-pointer">
            上传
            <input type="file" accept="image/*" multiple onChange={handleUpload} className="hidden" />
          </label>

          <button onClick={handleRotate} className="text-sm" disabled={!selectedImage}>
            旋转
          </button>

          <button onClick={handleFlipHorizontal} className="text-sm" disabled={!selectedImage}>
            水平翻转
          </button>

          <button onClick={handleFlipVertical} className="text-sm" disabled={!selectedImage}>
            垂直翻转
          </button>

          {files.length > 0 && (
            <button onClick={handleClearAll} className="text-sm text-red-500 mt-2">
              清空
            </button>
          )}
        </div>

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`flex-1 flex flex-col overflow-hidden transition ${dragging ? 'bg-blue-50 border-2 border-dashed border-blue-500' : 'bg-gray-50'}`}
        >
          <div
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={stopPanning}
            onMouseLeave={stopPanning}
            onDoubleClick={resetViewer}
            className={`relative flex-1 overflow-hidden bg-gray-50 select-none ${selectedImage ? (isPanning ? 'cursor-grabbing' : 'cursor-grab') : ''}`}
          >
            {selectedImage ? (
              <>
                <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
                  <img
                    src={selectedImage}
                    alt="preview"
                    draggable={false}
                    className="bg-white border shadow pointer-events-none"
                    style={{
                      maxWidth: 'none',
                      maxHeight: 'none',
                      width: 'auto',
                      height: 'auto',
                      transform: `translate3d(${position.x}px, ${position.y}px, 0) scale(${scale}) rotate(${rotate}deg) scale(${flipHorizontal ? -1 : 1}, ${flipVertical ? -1 : 1})`,
                      transformOrigin: 'center center',
                      willChange: 'transform',
                    }}
                  />
                </div>

                <div className="absolute right-4 top-4 bg-black/70 text-white text-xs px-3 py-1 rounded-full pointer-events-none">
                  {Math.round(scale * 100)}%
                </div>

                <div className="absolute left-4 bottom-4 bg-black/60 text-white text-xs px-3 py-2 rounded-lg pointer-events-none">
                  旋转：{rotate}° | 翻转：{flipHorizontal ? '水平' : ''} {flipVertical ? '垂直' : ''}
                </div>
              </>
            ) : (
              <div className="h-full flex items-center justify-center text-center text-gray-400">
                <div>
                  <div className="text-lg mb-2">拖拽图片到这里上传</div>
                  <div className="text-sm">最多 5 张 · 单张 ≤20MB</div>
                </div>
              </div>
            )}
          </div>

          {images.length > 0 && (
            <div className="h-28 bg-white border-t px-4 py-3 overflow-x-auto">
              <div className="flex gap-3">
                {images.map((img, i) => (
                  <div key={i} className="relative">
                    <button
                      onClick={() => handleSelectImage(i)}
                      className={`w-20 h-20 flex-shrink-0 rounded border overflow-hidden bg-gray-50 ${selectedIndex === i ? 'border-blue-600 ring-2 ring-blue-300' : 'border-gray-200'}`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                    <button
                      onClick={() => handleDelete(i)}
                      className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center bg-red-500 text-white text-xs rounded-full"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="w-80 bg-white border-l p-5 overflow-y-auto">
          <h2 className="font-bold text-lg mb-4">转换设置</h2>

          <label className="block w-full bg-gray-900 text-white text-center py-3 rounded-lg cursor-pointer">
            上传图片
            <input type="file" accept="image/*" multiple onChange={handleUpload} className="hidden" />
          </label>

          {files.length > 0 && (
            <div className="mt-3 text-sm text-gray-600 break-all">
              <div className="mb-1 flex justify-between">
                <span>已选：{files.length} / 5</span>
                <button onClick={handleClearAll} className="text-red-500 text-xs">清空全部</button>
              </div>

              {files.map((f, i) => (
                <div key={i} className="flex justify-between items-center">
                  <button
                    onClick={() => handleSelectImage(i)}
                    className={`text-left py-1 ${selectedIndex === i ? 'text-blue-600 font-medium' : 'text-gray-600'}`}
                  >
                    {f.name}
                  </button>
                  <button onClick={() => handleDelete(i)} className="text-red-500 text-xs">删除</button>
                </div>
              ))}
            </div>
          )}

          <div className="mt-5">
            <label className="block mb-1 text-sm">转换类型</label>
            <select value={format} onChange={(e) => setFormat(e.target.value)} className="w-full border rounded p-2">
              <option value="png">PNG</option>
              <option value="jpg">JPG</option>
              <option value="webp">WEBP</option>
              <option value="tiff">TIFF</option>
              <option value="cmyk">CMYK JPG</option>
            </select>
          </div>

          <div className="mt-4">
            <label className="block mb-1 text-sm">DPI</label>
            <select value={dpi} onChange={(e) => setDpi(e.target.value)} className="w-full border rounded p-2">
              <option value="72">72</option>
              <option value="150">150</option>
              <option value="300">300</option>
            </select>
          </div>

          <div className="mt-4">
            <label className="block mb-1 text-sm">图片质量：{quality}</label>
            <input
              type="range"
              min="10"
              max="100"
              step="1"
              value={quality}
              onChange={(e) => setQuality(Number(e.target.value))}
              className="w-full"
            />
          </div>

          <div className="mt-5 flex gap-2">
            <button onClick={handleRotate} disabled={!selectedImage} className="flex-1 border rounded p-2">
              旋转 90°
            </button>
            <button onClick={handleFlipHorizontal} disabled={!selectedImage} className="flex-1 border rounded p-2">
              水平翻转
            </button>
            <button onClick={handleFlipVertical} disabled={!selectedImage} className="flex-1 border rounded p-2">
              垂直翻转
            </button>
          </div>

          <button
            onClick={handleConvert}
            disabled={loading}
            className="mt-6 w-full bg-blue-600 disabled:bg-gray-400 text-white py-3 rounded-lg"
          >
            {loading ? '处理中...' : '开始导出'}
          </button>
        </div>
      </div>
    </div>
  )
}