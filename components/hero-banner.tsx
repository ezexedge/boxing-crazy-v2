"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import Image from "next/image"

const bannerImages = [
  {
    url: "/boxing-training-equipment-dark-background.jpg",
    title: "Equipamiento de Boxing de Alta Calidad",
    description: "Descubre nuestra colección de ropa deportiva diseñada para entrenamientos intensos.",
  },
  {
    url: "/professional-boxing-gear-athlete-training.jpg",
    title: "Entrena Como un Profesional",
    description: "Calidad profesional para atletas exigentes. Ropa que resiste tus entrenamientos más duros.",
  },
]

export function HeroBanner() {
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % bannerImages.length)
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  const currentBanner = bannerImages[currentIndex]

  return (
    <div className="relative h-[500px] md:h-[600px] overflow-hidden bg-neutral-900">
      {/* Imagen de fondo con AnimatePresence */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`image-${currentIndex}`}
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 1, ease: "easeInOut" }}
          className="absolute inset-0"
        >
          <Image
            src={currentBanner.url || "/placeholder.svg"}
            alt={currentBanner.title}
            fill
            className="object-cover"
            priority={currentIndex === 0}
            quality={90}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/30" />
        </motion.div>
      </AnimatePresence>

      {/* Contenido con AnimatePresence */}
      <div className="relative h-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={`content-${currentIndex}`}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
            className="absolute inset-0"
          >
            <div className="container mx-auto px-4 h-full flex items-center">
              <div className="max-w-3xl text-white">
                <h1 className="text-4xl md:text-6xl font-bold mb-6 text-balance leading-tight">
                  {currentBanner.title}
                </h1>
                <p className="text-lg md:text-xl text-neutral-200 mb-8 text-pretty leading-relaxed">
                  {currentBanner.description}
                </p>
                <div className="flex flex-wrap gap-4">
                  <Button size="lg" asChild className="bg-white text-neutral-900 hover:bg-neutral-100">
                    <Link href="/?genero=hombre">Colección Hombre</Link>
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    asChild
                    className="border-white text-white hover:bg-white/10 bg-transparent"
                  >
                    <Link href="/?genero=mujer">Colección Mujer</Link>
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

    </div>
  )
}
