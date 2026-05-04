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
  const [position, setPosition] = useState({ x: 0, y: 0 }) // 图片拖动位置
  const [isDraggingImage, setIsDraggingImage] = useState(false) // 是否正在拖动图片
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 }) // 拖动起始位置

  const [rotate, setRotate] = useState(0)
  const [flipHorizontal, setFlipHorizontal] = useState(false)
  const [flipVertical, setFlipVertical] = useState(false)

  const [selectedWidth, setSelectedWidth] = useState(0)
  const [selectedHeight, setSelectedHeight] = useState(0)
  const [selectedWidthMm, setSelectedWidthMm] = useState<number>(0)
  const [selectedHeightMm, setSelectedHeightMm] = useState<number>(0)

  const MAX_FILES = 5
  const MAX_SIZE = 20 * 1024 * 1024

  const selectedImage = images[selectedIndex]
  const selectedFile = files[selectedIndex]
  const hasImage = !!selectedImage

  const resetViewer = () => {
    setScale(1)
    setPosition({ x: 0, y: 0 }) // 重置位置
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

  // 滚轮缩放图片（只缩放图片，页面不动）
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!hasImage) return
    e.preventDefault()
    setScale(prev => {
      const next = e.deltaY < 0 ? prev + 0.1 : prev - 0.1
      return Math.min(Math.max(next, 0.5), 3)
    })
  }

  // 图片拖动 - 开始
  const handleImageMouseDown = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!hasImage) return
    setIsDraggingImage(true)
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    })
    e.preventDefault()
  }

  // 图片拖动 - 过程
  const handleImageMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingImage || !hasImage) return
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    })
    e.preventDefault()
  }

  // 图片拖动 - 结束
  const handleImageMouseUp = () => {
    setIsDraggingImage(false)
  }

  const handleImageMouseLeave = () => {
    setIsDraggingImage(false)
  }

  useEffect(() => {
    if (!selectedImage) {
      setSelectedWidth(0)
      setSelectedHeight(0)
      setSelectedWidthMm(0)
      setSelectedHeightMm(0)
      return
    }
    const img = new Image()
    img.onload = () => {
      const w = img.naturalWidth
      const h = img.naturalHeight
      setSelectedWidth(w)
      setSelectedHeight(h)
      const dpiNum = Number(dpi)
      const mmW = Math.round((w * 25.4) / dpiNum * 100) / 100
      const mmH = Math.round((h * 25.4) / dpiNum * 100) / 100
      setSelectedWidthMm(mmW)
      setSelectedHeightMm(mmH)
    }
    img.src = selectedImage
  }, [selectedImage, dpi])

  useEffect(() => {
    return () => images.forEach(url => URL.revokeObjectURL(url))
  }, [images])

  const handleRotate = () => {
    setRotate(prev => (prev + 90) % 360)
  }

  const handleFlipHorizontal = () => {
    setFlipHorizontal(prev => !prev)
  }

  const handleFlipVertical = () => {
    setFlipVertical(prev => !prev)
  }

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

      const res = await fetch('/api/convert', { method: 'POST', body: formData })

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

  return (
    <div className="h-screen flex flex-col bg-[#f7f8fa] text-[#1d1d1f]">
      <div className="h-14 bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center px-6 shadow-md text-white">
        <div className="font-bold text-lg tracking-wide">🖼️ 智能图片转换工具</div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-16 bg-white border-r border-gray-200 flex flex-col items-center py-6 gap-5 shadow-sm">
          <label className="text-sm cursor-pointer text-center hover:text-blue-600 transition">
            上传
            <input type="file" accept="image/*" multiple onChange={handleUpload} className="hidden" />
          </label>

          <button onClick={handleRotate} disabled={!hasImage} className="text-sm disabled:text-gray-300 hover:text-blue-600 transition">旋转</button>
          <button onClick={handleFlipHorizontal} disabled={!hasImage} className="text-sm disabled:text-gray-300 hover:text-blue-600 transition">水平翻转</button>
          <button onClick={handleFlipVertical} disabled={!hasImage} className="text-sm disabled:text-gray-300 hover:text-blue-600 transition">垂直翻转</button>

          {files.length > 0 && (
            <button onClick={handleClearAll} className="text-sm text-red-500 hover:text-red-600 transition">清空</button>
          )}
        </div>

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${
            dragging ? 'bg-blue-50 border-2 border-dashed border-blue-400' : 'bg-gray-50'
          }`}
        >
          {/* 图片预览区域：支持拖动 + 缩放 */}
          <div
            onWheel={handleWheel}
            onDoubleClick={resetViewer}
            onMouseMove={handleImageMouseMove}
            onMouseUp={handleImageMouseUp}
            onMouseLeave={handleImageMouseLeave}
            className="relative flex-1 bg-white flex items-center justify-center cursor-move"
          >
            {hasImage ? (
              <>
                <img
                  src={selectedImage}
                  alt="预览"
                  draggable={false}
                  onMouseDown={handleImageMouseDown}
                  className="rounded-lg shadow-lg"
                  style={{
                    maxWidth: '90%',
                    maxHeight: '90%',
                    transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotate}deg) scale(${flipHorizontal ? -1 : 1}, ${flipVertical ? -1 : 1})`,
                    transformOrigin: 'center center',
                    transition: isDraggingImage ? 'none' : 'transform 0.15s ease',
                    cursor: isDraggingImage ? 'grabbing' : 'grab',
                  }}
                />

                <div className="absolute right-4 top-4 bg-black/75 text-white text-xs px-3 py-1 rounded-full pointer-events-none">
                  {Math.round(scale * 100)}%
                </div>
              </>
            ) : (
              <div className="text-gray-400 text-center">
                <div className="text-lg mb-2">📁 拖拽图片到这里上传</div>
                <div className="text-sm">最多 5 张 · 单张 ≤ 20MB</div>
              </div>
            )}
          </div>

          {/* 底部多张图片缩略图（完全恢复） */}
          {images.length > 0 && (
            <div className="h-28 bg-white border-t border-gray-200 px-4 py-3 overflow-x-auto">
              <div className="flex gap-3 h-full">
                {images.map((img, i) => (
                  <div key={i} className="relative group h-full">
                    <button
                      onClick={() => handleSelectImage(i)}
                      className={`w-20 h-full rounded-lg border overflow-hidden ${
                        selectedIndex === i ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'
                      }`}
                    >
                      <img src={img} alt={`缩略图 ${i+1}`} className="w-full h-full object-cover" />
                    </button>
                    <button
                      onClick={() => handleDelete(i)}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs"
                    >×</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="w-80 bg-white border-l border-gray-200 p-6 overflow-y-auto">
          <h2 className="font-bold text-xl mb-5">⚙️ 转换设置</h2>

          {/* 毫米输入换算（无报错） */}
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 mb-4">
            <div className="text-sm font-medium text-blue-700 mb-2">📏 毫米 ↔ 像素 换算</div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500">宽度 (mm)</label>
                <input
                  type="number"
                  className="w-full border p-1.5 rounded text-sm mt-1"
                  value={selectedWidthMm ?? ''}
                  onChange={(e) => {
                    const mm = Number(e.target.value) || 0
                    setSelectedWidthMm(mm)
                    setSelectedWidth(Math.round((mm * Number(dpi)) / 25.4))
                  }}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">高度 (mm)</label>
                <input
                  type="number"
                  className="w-full border p-1.5 rounded text-sm mt-1"
                  value={selectedHeightMm ?? ''}
                  onChange={(e) => {
                    const mm = Number(e.target.value) || 0
                    setSelectedHeightMm(mm)
                    setSelectedHeight(Math.round((mm * Number(dpi)) / 25.4))
                  }}
                />
              </div>
            </div>
            <div className="text-xs text-gray-600 mt-2">
              对应像素：{selectedWidth} × {selectedHeight} px
            </div>
          </div>

          <label className="block bg-blue-600 text-white py-3 rounded-xl text-center cursor-pointer mb-4">
            📤 选择图片
            <input type="file" accept="image/*" multiple onChange={handleUpload} className="hidden" />
          </label>

          <div className="mt-3">
            <label className="text-sm font-medium">格式</label>
            <select value={format} onChange={(e) => setFormat(e.target.value)} className="w-full border rounded-lg p-2 mt-1">
              <option value="png">PNG</option>
              <option value="jpg">JPG</option>
              <option value="webp">WEBP</option>
              <option value="tiff">TIFF</option>
              <option value="cmyk">CMYK</option>
            </select>
          </div>

          <div className="mt-3">
            <label className="text-sm font-medium">DPI</label>
            <select value={dpi} onChange={(e) => setDpi(e.target.value)} className="w-full border rounded-lg p-2 mt-1">
              <option value="72">72</option>
              <option value="150">150</option>
              <option value="300">300</option>
            </select>
          </div>

          <div className="mt-3">
            <label className="text-sm font-medium">质量：{quality}</label>
            <input type="range" min="10" max="100" value={quality} onChange={(e) => setQuality(+e.target.value)} className="w-full mt-1" />
          </div>

          <div className="mt-4 flex gap-2">
            <button onClick={handleRotate} disabled={!hasImage} className="flex-1 border rounded-lg p-2">旋转</button>
            <button onClick={handleFlipHorizontal} disabled={!hasImage} className="flex-1 border rounded-lg p-2">水平</button>
            <button onClick={handleFlipVertical} disabled={!hasImage} className="flex-1 border rounded-lg p-2">垂直</button>
          </div>

          <button
            onClick={handleConvert}
            disabled={loading || !hasImage}
            className="mt-5 w-full bg-blue-600 text-white py-3 rounded-xl"
          >
            {loading ? '处理中...' : '🚀 开始转换'}
          </button>
        </div>
      </div>
    </div>
  )
}