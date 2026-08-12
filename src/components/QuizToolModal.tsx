import React, { useState, useRef } from 'react';
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Camera, Image as ImageIcon, X, Loader2, RotateCw } from 'lucide-react';
import Tesseract from 'tesseract.js';

interface QuizToolModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (text: string, numQuestions: number) => void;
}

export function QuizToolModal({ isOpen, onClose, onSubmit }: QuizToolModalProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const [rotation, setRotation] = useState(0);
  const [numQuestions, setNumQuestions] = useState(5);
  const [step, setStep] = useState<'upload' | 'edit' | 'options' | 'processing'>('upload');
  
  const imgRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setImageSrc(reader.result?.toString() || '');
        setStep('edit');
      });
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      // To simplify, we can just trigger file input with capture="environment" for mobile camera.
      // Doing a full custom camera view is complex. Let's just use the file input approach for both.
      if (fileInputRef.current) {
        fileInputRef.current.setAttribute('capture', 'environment');
        fileInputRef.current.click();
      }
      stream.getTracks().forEach(t => t.stop()); // close the stream we just opened to check permissions
    } catch (e) {
      alert("Camera access denied or not available");
    }
  };

  const processImage = async () => {
    if (!imageSrc || !completedCrop || !imgRef.current) return;
    
    setStep('processing');
    
    setTimeout(async () => {
      if (!imgRef.current) return;

      // Create canvas to draw the cropped/rotated image
      const canvas = document.createElement('canvas');
      const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
      const scaleY = imgRef.current.naturalHeight / imgRef.current.height;
      const ctx = canvas.getContext('2d');

      if (!ctx) return;

      canvas.width = completedCrop.width * scaleX;
      canvas.height = completedCrop.height * scaleY;

      // We need to handle rotation and cropping
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.translate(-canvas.width / 2, -canvas.height / 2);
      
      ctx.drawImage(
        imgRef.current,
        completedCrop.x * scaleX,
        completedCrop.y * scaleY,
        completedCrop.width * scaleX,
        completedCrop.height * scaleY,
        0,
        0,
        completedCrop.width * scaleX,
        completedCrop.height * scaleY
      );
      
      ctx.restore();

      try {
        const dataUrl = canvas.toDataURL('image/jpeg');
        const result = await Tesseract.recognize(dataUrl, 'eng');
        const text = result.data.text;
        
        onSubmit(text, numQuestions);
        resetAndClose();
      } catch (error) {
        console.error(error);
        alert("Failed to extract text from image.");
        setStep('options');
      }
    }, 100);
  };

  const resetAndClose = () => {
    setImageSrc(null);
    setCrop(undefined);
    setCompletedCrop(null);
    setRotation(0);
    setNumQuestions(5);
    setStep('upload');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-100">Quiz Maker Tool</h2>
          <button onClick={resetAndClose} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className={step === 'upload' ? 'block' : 'hidden'}>
            <div className="flex flex-col gap-4 items-center justify-center py-12">
              <input 
                type="file" 
                accept="image/*" 
                ref={fileInputRef} 
                className="hidden" 
                onChange={handleFileChange} 
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full max-w-sm flex items-center justify-center gap-3 p-6 bg-zinc-800 hover:bg-zinc-700 rounded-xl border border-dashed border-zinc-600 transition-colors"
              >
                <ImageIcon size={32} className="text-blue-400" />
                <span className="font-medium text-zinc-200">Upload Image from Device</span>
              </button>
              
              <div className="text-zinc-500 font-medium">OR</div>

              <button 
                onClick={handleCamera}
                className="w-full max-w-sm flex items-center justify-center gap-3 p-6 bg-zinc-800 hover:bg-zinc-700 rounded-xl border border-dashed border-zinc-600 transition-colors"
              >
                <Camera size={32} className="text-emerald-400" />
                <span className="font-medium text-zinc-200">Take a Photo (Camera)</span>
              </button>
            </div>
          </div>

          <div className={step === 'edit' && imageSrc ? 'block' : 'hidden'}>
            <div className="flex flex-col items-center">
              <div className="w-full bg-black rounded-lg overflow-hidden flex justify-center mb-4 max-h-[50vh]">
                <ReactCrop
                  crop={crop}
                  onChange={(_, percentCrop) => setCrop(percentCrop)}
                  onComplete={(c) => setCompletedCrop(c)}
                  className="max-h-full"
                >
                  <img
                    ref={imgRef}
                    alt="Crop me"
                    src={imageSrc || undefined}
                    style={{ transform: `rotate(${rotation}deg)`, maxHeight: '50vh', objectFit: 'contain' }}
                    onLoad={(e) => {
                       const { width, height } = e.currentTarget;
                       setCrop({ unit: '%', width: 90, height: 90, x: 5, y: 5 });
                       setCompletedCrop({
                         x: width * 0.05,
                         y: height * 0.05,
                         width: width * 0.9,
                         height: height * 0.9,
                         unit: 'px'
                       });
                    }}
                  />
                </ReactCrop>
              </div>
              <div className="flex gap-4 w-full justify-between items-center bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                <button 
                  onClick={() => setRotation(r => r + 90)}
                  className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-medium"
                >
                  <RotateCw size={16} /> Rotate 90°
                </button>
                <button 
                  onClick={() => setStep('options')}
                  disabled={!completedCrop?.width || !completedCrop?.height}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
                >
                  Next Step
                </button>
              </div>
            </div>
          </div>

          <div className={step === 'options' ? 'block' : 'hidden'}>
            <div className="py-8 max-w-sm mx-auto">
              <h3 className="text-lg font-medium text-zinc-200 mb-6 text-center">How many questions do you want?</h3>
              
              <div className="flex justify-between gap-4 mb-4">
                {[3, 5, 10, 15].map(num => (
                  <button
                    key={num}
                    onClick={() => setNumQuestions(num)}
                    className={`flex-1 py-3 rounded-xl font-bold text-lg border-2 transition-all ${
                      numQuestions === num 
                        ? 'border-blue-500 bg-blue-500/10 text-blue-400' 
                        : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
              
              <div className="mb-8">
                <label className="block text-sm font-medium text-zinc-400 mb-2">Or enter custom number (1-50):</label>
                <input 
                  type="number" 
                  min="1" 
                  max="50" 
                  value={numQuestions || ''}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    if (!isNaN(val)) {
                      setNumQuestions(Math.min(50, Math.max(1, val)));
                    } else {
                      setNumQuestions(0);
                    }
                  }}
                  onBlur={() => {
                     if (!numQuestions || numQuestions < 1) setNumQuestions(5);
                  }}
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <button 
                onClick={processImage}
                disabled={!numQuestions || numQuestions < 1}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:hover:bg-emerald-600 text-white rounded-xl font-bold text-lg transition-colors flex justify-center items-center gap-2 shadow-[0_0_20px_rgba(5,150,105,0.3)]"
              >
                <ImageIcon size={20} /> Generate Quiz
              </button>
            </div>
          </div>

          <div className={step === 'processing' ? 'block' : 'hidden'}>
            <div className="py-16 flex flex-col items-center justify-center text-center">
              <Loader2 size={48} className="text-blue-500 animate-spin mb-6" />
              <h3 className="text-xl font-semibold text-zinc-100 mb-2">Analyzing Image & Extracting Text...</h3>
              <p className="text-zinc-400 max-w-xs">This might take a few seconds depending on the image size and text density.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
