'use client';

import { useState, useEffect } from 'react';
import { LottieAnimation } from '../components/ui/LottieAnimation';
import mergingCoinsAnimation from '../assets/lottie/MergingCoinsHero.json';
import Image from 'next/image';

export default function DeckPage() {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    // Slide 1: Title
    {
      id: 'title',
      content: (
        <div className="flex flex-col items-center justify-center h-full text-center p-12 relative">
          <div className="relative w-96 h-96 mb-8 flex items-center justify-center">
             {/* Lottie Background */}
            <div className="absolute inset-0 z-0 mt-12 mr-3">
                <LottieAnimation animationData={mergingCoinsAnimation} />
            </div>
            {/* Logo Foreground - Perfectly Centered */}
            <div className="absolute z-10 flex items-center justify-center">
                <Image 
                    src="/logo.png" 
                    alt="Starc Logo" 
                    width={300} 
                    height={300} 
                    className="object-contain"
                />
            </div>
          </div>
          <h1 className="text-7xl font-bold text-zinc-900 font-display mb-4 tracking-tight">starc</h1>
          <p className="text-2xl text-zinc-500 font-light">Unified Stablecoin Payments on Arc</p>
        </div>
      )
    },
    // Slide 2: The Problem
    {
      id: 'problem',
      content: (
        <div className="flex h-full">
          <div className="w-1/2 p-16 flex flex-col justify-center bg-white">
            <h2 className="text-5xl font-bold text-zinc-900 font-display mb-12 leading-tight">The Fragmented <br/>Reality</h2>
            <ul className="space-y-8 text-xl text-zinc-600">
              <li className="flex items-center gap-4">
                <span className="w-3 h-3 bg-red-500 rounded-full shadow-sm"></span>
                High Transaction Fees
              </li>
              <li className="flex items-center gap-4">
                <span className="w-3 h-3 bg-red-500 rounded-full shadow-sm"></span>
                Slow Settlement Times
              </li>
              <li className="flex items-center gap-4">
                <span className="w-3 h-3 bg-red-500 rounded-full shadow-sm"></span>
                Opaque Intermediaries
              </li>
            </ul>
          </div>
          <div className="w-1/2 relative h-full bg-zinc-100">
            <Image 
              src="/slides/MerchantStreet.png" 
              alt="Busy Merchant Street" 
              fill 
              className="object-cover"
              priority
            />
          </div>
        </div>
      )
    },
    // Slide 3: The Solution
    {
      id: 'solution',
      content: (
        <div className="flex flex-col h-full bg-zinc-50">
          <div className="h-2/3 relative bg-zinc-900 flex items-center justify-center overflow-hidden">
             <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20"></div>
            <div className="relative w-full h-full max-w-4xl mx-auto">
                <Image 
                src="/slides/pay.png" 
                alt="Starc Payment Experience" 
                fill 
                className="object-contain p-8"
                priority
                />
            </div>
          </div>
          <div className="h-1/3 p-12 bg-white flex flex-col justify-center items-center text-center border-t border-zinc-100">
            <h2 className="text-4xl font-bold text-zinc-900 font-display mb-4">Seamless Settlement</h2>
            <p className="text-xl text-zinc-500 max-w-2xl font-light">
              Instant, verifiable USDC payments directly to merchant vaults. 
              <span className="text-zinc-900 font-medium ml-2">No friction, just flow.</span>
            </p>
          </div>
        </div>
      )
    },
    // Slide 4: Architecture
    {
      id: 'architecture',
      content: (
        <div className="flex flex-col items-center justify-center h-full p-12 bg-zinc-50">
          <h2 className="text-5xl font-bold text-zinc-900 font-display mb-16">Architecture: Safety First</h2>
          <div className="grid grid-cols-3 gap-8 max-w-7xl w-full px-8">
            <div className="bg-white p-10 rounded-3xl shadow-sm border border-zinc-100 hover:shadow-md transition-shadow">
              <div className="text-indigo-600 mb-6 bg-indigo-50 w-16 h-16 rounded-2xl flex items-center justify-center">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <h3 className="text-2xl font-bold text-zinc-900 mb-3">ERC4626 Standard</h3>
              <p className="text-zinc-500 leading-relaxed">Single-asset vaults (USDC) eliminate oracle dependency and manipulation risks.</p>
            </div>
            <div className="bg-white p-10 rounded-3xl shadow-sm border border-zinc-100 hover:shadow-md transition-shadow">
              <div className="text-emerald-600 mb-6 bg-emerald-50 w-16 h-16 rounded-2xl flex items-center justify-center">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <h3 className="text-2xl font-bold text-zinc-900 mb-3">Circle Integration</h3>
              <p className="text-zinc-500 leading-relaxed">Direct integration with Circle Programmable Wallets for real-time on-chain data.</p>
            </div>
            <div className="bg-white p-10 rounded-3xl shadow-sm border border-zinc-100 hover:shadow-md transition-shadow">
              <div className="text-amber-600 mb-6 bg-amber-50 w-16 h-16 rounded-2xl flex items-center justify-center">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
              </div>
              <h3 className="text-2xl font-bold text-zinc-900 mb-3">Live on Arc</h3>
              <p className="text-zinc-500 leading-relaxed">Fully deployed and verified on Arc Testnet. Ready for production pilots.</p>
            </div>
          </div>
        </div>
      )
    },
    // Slide 5: Demo
    {
      id: 'demo',
      content: (
        <div className="flex flex-col items-center justify-center h-full text-center p-12 bg-zinc-900 text-white">
          <div className="w-32 h-32 mb-8 relative">
             <div className="absolute inset-0 bg-indigo-500 blur-3xl opacity-20 rounded-full"></div>
             <Image 
                src="/logo.png" 
                alt="Starc Logo" 
                width={128} 
                height={128} 
                className="object-contain relative z-10 brightness-0 invert"
            />
          </div>
          <h2 className="text-6xl font-bold font-display mb-8">Live Demo</h2>
          <p className="text-2xl text-zinc-400 mb-12 max-w-2xl">
            Experience the future of payments. <br/>
            Create a merchant link, scan, and pay.
          </p>
          <a 
            href="/"
            target="_blank"
            className="px-8 py-4 bg-white text-zinc-900 rounded-full font-bold text-xl hover:bg-zinc-100 transition-all hover:scale-105 flex items-center gap-2"
          >
            Launch App
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
          </a>
        </div>
      )
    },
    // Slide 6: Conclusion
    {
      id: 'end',
      content: (
        <div className="flex flex-col items-center justify-center h-full text-center p-12 relative overflow-hidden">
           <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500"></div>
           <div className="mb-12">
             <Image 
                src="/logo.png" 
                alt="Starc Logo" 
                width={80} 
                height={80} 
                className="object-contain"
            />
           </div>
          <h1 className="text-6xl font-bold text-zinc-900 font-display mb-8">The Future of Payments</h1>
          <div className="text-3xl text-zinc-500 mb-16 font-light">Built on Arc. Powered by Starc.</div>
          <div className="text-sm font-mono text-zinc-400 bg-zinc-50 px-4 py-2 rounded-full border border-zinc-100">
            starc-project.vercel.app
          </div>
        </div>
      )
    }
  ];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        setCurrentSlide(prev => Math.min(prev + 1, slides.length - 1));
      } else if (e.key === 'ArrowLeft') {
        setCurrentSlide(prev => Math.max(prev - 1, 0));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [slides.length]);

  return (
    <div className="h-screen w-screen bg-white overflow-hidden relative">
      {/* Slide Content */}
      <div className="h-full w-full">
        {slides[currentSlide].content}
      </div>

      {/* Navigation Controls */}
      <div className="absolute bottom-8 right-8 flex gap-4">
        <button 
          onClick={() => setCurrentSlide(prev => Math.max(prev - 1, 0))}
          disabled={currentSlide === 0}
          className="p-2 rounded-full bg-zinc-100 text-zinc-600 hover:bg-zinc-200 disabled:opacity-50 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <button 
          onClick={() => setCurrentSlide(prev => Math.min(prev + 1, slides.length - 1))}
          disabled={currentSlide === slides.length - 1}
          className="p-2 rounded-full bg-zinc-100 text-zinc-600 hover:bg-zinc-200 disabled:opacity-50 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>

      {/* Progress Indicator */}
      <div className="absolute bottom-8 left-8 flex gap-2">
        {slides.map((_, idx) => (
          <div 
            key={idx}
            className={`w-2 h-2 rounded-full transition-colors ${idx === currentSlide ? 'bg-zinc-900' : 'bg-zinc-200'}`}
          />
        ))}
      </div>
    </div>
  );
}
