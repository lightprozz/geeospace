'use client'
// ---------------------------------------------------------------------------
// End Screen — "Good bye & See you again!" with animated smiley face
// ---------------------------------------------------------------------------

import { Smile } from 'lucide-react'

export function EndScreen() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 animate-in fade-in zoom-in duration-500">
      <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-10 text-center leading-tight tracking-tight">
        Good bye & <br /> See you again!
      </h1>
      <div className="w-48 h-48 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-500 border-4 border-yellow-600 flex items-center justify-center shadow-xl mb-8 relative hover:scale-105 transition-transform duration-300">
        <Smile className="w-32 h-32 text-yellow-900" strokeWidth={1.5} />
      </div>
    </div>
  )
}
