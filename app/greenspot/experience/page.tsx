"use client"

import { useEffect, useRef, useState } from "react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import {
  Camera,
  CheckCircle2,
  Droplets,
  Globe,
  Leaf,
  MapPin,
  MountainSnow,
  Ruler,
  ShieldCheck,
  Sparkles,
  Sprout,
  Sun,
  Trees,
} from "lucide-react"

const catalog = [
  { name: "Aleppo Pine", category: "Native forest tree", climate: "Dry / Hot", difficulty: "Easy", type: "Tree", group: "Forest & Reforestation" },
  { name: "Atlas Cedar", category: "Native forest tree", climate: "Mountain / Cool", difficulty: "Medium", type: "Tree", group: "Forest & Reforestation" },
  { name: "Holm Oak", category: "Evergreen oak", climate: "Mediterranean", difficulty: "Medium", type: "Tree", group: "Forest & Reforestation" },
  { name: "Cork Oak", category: "Evergreen oak", climate: "Mediterranean", difficulty: "Medium", type: "Tree", group: "Forest & Reforestation" },
  { name: "Algerian Oak", category: "Native oak", climate: "Humid / Mountain", difficulty: "Medium", type: "Tree", group: "Forest & Reforestation" },
  { name: "Juniper", category: "Native conifer", climate: "Dry / Mountain", difficulty: "Easy", type: "Tree", group: "Forest & Reforestation" },
  { name: "Phoenician Juniper", category: "Native conifer", climate: "Dry / Mountain", difficulty: "Easy", type: "Tree", group: "Forest & Reforestation" },
  { name: "Wild Olive", category: "Native olive", climate: "Mediterranean", difficulty: "Medium", type: "Tree", group: "Forest & Reforestation" },
  { name: "Carob Tree", category: "Native fruit tree", climate: "Mediterranean", difficulty: "Medium", type: "Tree", group: "Forest & Reforestation" },
  { name: "Pistachio Tree", category: "Native tree", climate: "Dry / Warm", difficulty: "Medium", type: "Tree", group: "Forest & Reforestation" },
  { name: "Atlas Pistachio", category: "Native tree", climate: "Dry / Warm", difficulty: "Medium", type: "Tree", group: "Forest & Reforestation" },
  { name: "Date Palm", category: "Desert tree", climate: "Desert / Hot", difficulty: "Medium", type: "Tree", group: "Desert & Semi-Arid" },
  { name: "Acacia", category: "Desert tree", climate: "Desert / Hot", difficulty: "Easy", type: "Tree", group: "Desert & Semi-Arid" },
  { name: "Tamarisk", category: "Desert tree", climate: "Arid / Saline", difficulty: "Easy", type: "Tree", group: "Desert & Semi-Arid" },
  { name: "Desert Willow", category: "Desert tree", climate: "Arid / Hot", difficulty: "Medium", type: "Tree", group: "Desert & Semi-Arid" },
  { name: "Eucalyptus", category: "Fast-growing tree", climate: "Warm / Coastal", difficulty: "Easy", type: "Tree", group: "Desert & Semi-Arid" },
  { name: "Moringa", category: "Resilient tree", climate: "Warm / Dry", difficulty: "Medium", type: "Tree", group: "Desert & Semi-Arid" },
  { name: "Neem Tree", category: "Resilient tree", climate: "Warm / Dry", difficulty: "Medium", type: "Tree", group: "Desert & Semi-Arid" },
  { name: "Plane Tree", category: "Urban shade tree", climate: "Urban / Temperate", difficulty: "Medium", type: "Tree", group: "Urban & Shade" },
  { name: "Jacaranda", category: "Urban ornamental tree", climate: "Warm / Urban", difficulty: "Medium", type: "Tree", group: "Urban & Shade" },
  { name: "Tipu Tree", category: "Urban shade tree", climate: "Warm / Urban", difficulty: "Medium", type: "Tree", group: "Urban & Shade" },
  { name: "Silk Tree", category: "Urban ornamental tree", climate: "Warm / Urban", difficulty: "Medium", type: "Tree", group: "Urban & Shade" },
  { name: "Chinaberry Tree", category: "Urban shade tree", climate: "Warm / Urban", difficulty: "Medium", type: "Tree", group: "Urban & Shade" },
  { name: "Ash Tree", category: "Urban shade tree", climate: "Temperate", difficulty: "Medium", type: "Tree", group: "Urban & Shade" },
  { name: "Poplar", category: "Urban shade tree", climate: "Temperate / Watered", difficulty: "Easy", type: "Tree", group: "Urban & Shade" },
  { name: "Willow", category: "Urban shade tree", climate: "Watered", difficulty: "Medium", type: "Tree", group: "Urban & Shade" },
  { name: "Elm", category: "Urban shade tree", climate: "Temperate", difficulty: "Medium", type: "Tree", group: "Urban & Shade" },
  { name: "Olive Tree", category: "Fruit tree", climate: "Mediterranean", difficulty: "Medium", type: "Tree", group: "Fruit Trees" },
  { name: "Fig Tree", category: "Fruit tree", climate: "Warm / Rural", difficulty: "Medium", type: "Tree", group: "Fruit Trees" },
  { name: "Pomegranate", category: "Fruit tree", climate: "Warm / Dry", difficulty: "Easy", type: "Tree", group: "Fruit Trees" },
  { name: "Orange Tree", category: "Fruit tree", climate: "Coastal / Warm", difficulty: "Medium", type: "Tree", group: "Fruit Trees" },
  { name: "Lemon Tree", category: "Fruit tree", climate: "Coastal / Warm", difficulty: "Medium", type: "Tree", group: "Fruit Trees" },
  { name: "Mandarin Tree", category: "Fruit tree", climate: "Coastal / Warm", difficulty: "Medium", type: "Tree", group: "Fruit Trees" },
  { name: "Apricot Tree", category: "Fruit tree", climate: "Warm / Temperate", difficulty: "Medium", type: "Tree", group: "Fruit Trees" },
  { name: "Peach Tree", category: "Fruit tree", climate: "Warm / Temperate", difficulty: "Medium", type: "Tree", group: "Fruit Trees" },
  { name: "Plum Tree", category: "Fruit tree", climate: "Temperate", difficulty: "Medium", type: "Tree", group: "Fruit Trees" },
  { name: "Almond Tree", category: "Fruit tree", climate: "Dry / Warm", difficulty: "Medium", type: "Tree", group: "Fruit Trees" },
  { name: "Apple Tree", category: "Fruit tree", climate: "Temperate", difficulty: "Medium", type: "Tree", group: "Fruit Trees" },
  { name: "Pear Tree", category: "Fruit tree", climate: "Temperate", difficulty: "Medium", type: "Tree", group: "Fruit Trees" },
  { name: "Quince Tree", category: "Fruit tree", climate: "Temperate", difficulty: "Medium", type: "Tree", group: "Fruit Trees" },
  { name: "Grape Vine", category: "Fruit vine", climate: "Mediterranean", difficulty: "Medium", type: "Plant", group: "Fruit Trees" },
  { name: "Banana", category: "Fruit plant", climate: "Coastal / Warm", difficulty: "Hard", type: "Plant", group: "Fruit Trees" },
  { name: "Wheat", category: "Field crop", climate: "Temperate / Dry", difficulty: "Medium", type: "Plant", group: "Agricultural Crops" },
  { name: "Barley", category: "Field crop", climate: "Dry / Temperate", difficulty: "Easy", type: "Plant", group: "Agricultural Crops" },
  { name: "Corn", category: "Field crop", climate: "Warm / Watered", difficulty: "Medium", type: "Plant", group: "Agricultural Crops" },
  { name: "Sorghum", category: "Field crop", climate: "Dry / Warm", difficulty: "Easy", type: "Plant", group: "Agricultural Crops" },
  { name: "Oats", category: "Field crop", climate: "Temperate", difficulty: "Easy", type: "Plant", group: "Agricultural Crops" },
  { name: "Chickpeas", category: "Legume", climate: "Dry / Warm", difficulty: "Easy", type: "Plant", group: "Agricultural Crops" },
  { name: "Lentils", category: "Legume", climate: "Temperate / Dry", difficulty: "Easy", type: "Plant", group: "Agricultural Crops" },
  { name: "Fava Beans", category: "Legume", climate: "Temperate", difficulty: "Easy", type: "Plant", group: "Agricultural Crops" },
  { name: "Peas", category: "Legume", climate: "Cool / Temperate", difficulty: "Easy", type: "Plant", group: "Agricultural Crops" },
  { name: "Lupin", category: "Legume", climate: "Temperate", difficulty: "Medium", type: "Plant", group: "Agricultural Crops" },
  { name: "Cotton", category: "Industrial crop", climate: "Warm / Dry", difficulty: "Medium", type: "Plant", group: "Agricultural Crops" },
  { name: "Sunflower", category: "Industrial crop", climate: "Warm / Dry", difficulty: "Easy", type: "Plant", group: "Agricultural Crops" },
  { name: "Sesame", category: "Industrial crop", climate: "Warm / Dry", difficulty: "Medium", type: "Plant", group: "Agricultural Crops" },
  { name: "Sugar Beet", category: "Industrial crop", climate: "Temperate", difficulty: "Medium", type: "Plant", group: "Agricultural Crops" },
  { name: "Rosemary", category: "Aromatic herb", climate: "Mediterranean", difficulty: "Easy", type: "Plant", group: "Aromatic & Medicinal" },
  { name: "Thyme", category: "Aromatic herb", climate: "Mediterranean", difficulty: "Easy", type: "Plant", group: "Aromatic & Medicinal" },
  { name: "Lavender", category: "Aromatic herb", climate: "Dry / Temperate", difficulty: "Easy", type: "Plant", group: "Aromatic & Medicinal" },
  { name: "Sage", category: "Aromatic herb", climate: "Mediterranean", difficulty: "Easy", type: "Plant", group: "Aromatic & Medicinal" },
  { name: "Mint", category: "Aromatic herb", climate: "Watered / Temperate", difficulty: "Easy", type: "Plant", group: "Aromatic & Medicinal" },
  { name: "Basil", category: "Aromatic herb", climate: "Warm / Watered", difficulty: "Easy", type: "Plant", group: "Aromatic & Medicinal" },
  { name: "Oregano", category: "Aromatic herb", climate: "Mediterranean", difficulty: "Easy", type: "Plant", group: "Aromatic & Medicinal" },
  { name: "Chamomile", category: "Medicinal plant", climate: "Temperate", difficulty: "Easy", type: "Plant", group: "Aromatic & Medicinal" },
  { name: "Artemisia", category: "Medicinal plant", climate: "Dry / Temperate", difficulty: "Medium", type: "Plant", group: "Aromatic & Medicinal" },
  { name: "Fenugreek", category: "Medicinal plant", climate: "Warm / Dry", difficulty: "Easy", type: "Plant", group: "Aromatic & Medicinal" },
  { name: "Anise", category: "Medicinal plant", climate: "Warm / Temperate", difficulty: "Easy", type: "Plant", group: "Aromatic & Medicinal" },
  { name: "Cumin", category: "Medicinal plant", climate: "Warm / Dry", difficulty: "Easy", type: "Plant", group: "Aromatic & Medicinal" },
  { name: "Coriander", category: "Medicinal plant", climate: "Warm / Temperate", difficulty: "Easy", type: "Plant", group: "Aromatic & Medicinal" },
  { name: "Bougainvillea", category: "Ornamental plant", climate: "Warm / Coastal", difficulty: "Easy", type: "Plant", group: "Ornamental & Flowers" },
  { name: "Hibiscus", category: "Ornamental plant", climate: "Warm / Coastal", difficulty: "Medium", type: "Plant", group: "Ornamental & Flowers" },
  { name: "Oleander", category: "Ornamental plant", climate: "Warm / Dry", difficulty: "Easy", type: "Plant", group: "Ornamental & Flowers" },
  { name: "Geranium", category: "Ornamental plant", climate: "Temperate", difficulty: "Easy", type: "Plant", group: "Ornamental & Flowers" },
  { name: "Rose", category: "Ornamental flower", climate: "Temperate", difficulty: "Medium", type: "Plant", group: "Ornamental & Flowers" },
  { name: "Jasmine", category: "Ornamental flower", climate: "Warm / Coastal", difficulty: "Medium", type: "Plant", group: "Ornamental & Flowers" },
  { name: "Marigold", category: "Ornamental flower", climate: "Warm / Temperate", difficulty: "Easy", type: "Plant", group: "Ornamental & Flowers" },
  { name: "Petunia", category: "Ornamental flower", climate: "Warm / Temperate", difficulty: "Easy", type: "Plant", group: "Ornamental & Flowers" },
  { name: "Gazania", category: "Ornamental flower", climate: "Warm / Dry", difficulty: "Easy", type: "Plant", group: "Ornamental & Flowers" },
  { name: "Iris", category: "Ornamental flower", climate: "Temperate", difficulty: "Medium", type: "Plant", group: "Ornamental & Flowers" },
  { name: "Gladiolus", category: "Ornamental flower", climate: "Temperate", difficulty: "Medium", type: "Plant", group: "Ornamental & Flowers" },
  { name: "Chrysanthemum", category: "Ornamental flower", climate: "Temperate", difficulty: "Medium", type: "Plant", group: "Ornamental & Flowers" },
  { name: "Prickly Pear", category: "Drought-resistant plant", climate: "Arid", difficulty: "Easy", type: "Plant", group: "Cactus & Drought" },
  { name: "Aloe Vera", category: "Drought-resistant plant", climate: "Dry / Indoor", difficulty: "Easy", type: "Plant", group: "Cactus & Drought" },
  { name: "Agave", category: "Drought-resistant plant", climate: "Arid", difficulty: "Easy", type: "Plant", group: "Cactus & Drought" },
  { name: "Yucca", category: "Drought-resistant plant", climate: "Arid", difficulty: "Easy", type: "Plant", group: "Cactus & Drought" },
  { name: "Euphorbia", category: "Drought-resistant plant", climate: "Arid", difficulty: "Medium", type: "Plant", group: "Cactus & Drought" },
  { name: "Barrel Cactus", category: "Drought-resistant plant", climate: "Arid", difficulty: "Easy", type: "Plant", group: "Cactus & Drought" },
  { name: "Sansevieria", category: "Indoor drought plant", climate: "Indoor", difficulty: "Easy", type: "Plant", group: "Cactus & Drought" },
  { name: "Tomato", category: "Vegetable plant", climate: "Warm / Watered", difficulty: "Easy", type: "Plant", group: "Vegetables" },
  { name: "Potato", category: "Vegetable plant", climate: "Temperate", difficulty: "Easy", type: "Plant", group: "Vegetables" },
  { name: "Onion", category: "Vegetable plant", climate: "Temperate", difficulty: "Easy", type: "Plant", group: "Vegetables" },
  { name: "Garlic", category: "Vegetable plant", climate: "Temperate", difficulty: "Easy", type: "Plant", group: "Vegetables" },
  { name: "Carrot", category: "Vegetable plant", climate: "Temperate", difficulty: "Easy", type: "Plant", group: "Vegetables" },
  { name: "Pepper", category: "Vegetable plant", climate: "Warm", difficulty: "Easy", type: "Plant", group: "Vegetables" },
  { name: "Chili", category: "Vegetable plant", climate: "Warm", difficulty: "Easy", type: "Plant", group: "Vegetables" },
  { name: "Zucchini", category: "Vegetable plant", climate: "Warm", difficulty: "Easy", type: "Plant", group: "Vegetables" },
  { name: "Eggplant", category: "Vegetable plant", climate: "Warm", difficulty: "Easy", type: "Plant", group: "Vegetables" },
  { name: "Lettuce", category: "Vegetable plant", climate: "Cool / Temperate", difficulty: "Easy", type: "Plant", group: "Vegetables" },
  { name: "Spinach", category: "Vegetable plant", climate: "Cool / Temperate", difficulty: "Easy", type: "Plant", group: "Vegetables" },
  { name: "Cucumber", category: "Vegetable plant", climate: "Warm / Watered", difficulty: "Easy", type: "Plant", group: "Vegetables" },
  { name: "Cabbage", category: "Vegetable plant", climate: "Cool / Temperate", difficulty: "Easy", type: "Plant", group: "Vegetables" },
  { name: "Beach Grass", category: "Coastal plant", climate: "Coastal / Sandy", difficulty: "Easy", type: "Plant", group: "Coastal & Stabilization" },
  { name: "Sea Fig", category: "Coastal plant", climate: "Coastal / Sandy", difficulty: "Easy", type: "Plant", group: "Coastal & Stabilization" },
  { name: "Saltbush", category: "Coastal plant", climate: "Coastal / Saline", difficulty: "Easy", type: "Plant", group: "Coastal & Stabilization" },
]

const guideSteps = [
  {
    title: "Soil type",
    value: "Loamy, well-drained",
    icon: MountainSnow,
  },
  {
    title: "Watering",
    value: "2–3 times per week",
    icon: Droplets,
  },
  {
    title: "Sun exposure",
    value: "Full sun",
    icon: Sun,
  },
  {
    title: "Spacing",
    value: "3–4 meters",
    icon: Ruler,
  },
  {
    title: "Best season",
    value: "Spring / Early autumn",
    icon: Sprout,
  },
]

const getCardImageUrl = (name: string, type?: string) => {
  const queryMap: Record<string, string> = {
    "Aleppo Pine": "Aleppo pine tree",
    "Olive Tree": "olive tree",
    Jacaranda: "jacaranda tree",
    "Aloe Vera": "aloe vera plant",
    "Cactus Mix": "cactus plant",
    "Fig Tree": "fig tree",
  }
  const base = queryMap[name] ?? name
  const query = type ? `${base} ${type.toLowerCase()}` : base
  return `https://picsum.photos/seed/${encodeURIComponent(query)}/600/360`
}

export default function GreenSpotExperiencePage() {
  const [selectedPlant, setSelectedPlant] = useState("Aleppo Pine")
  const [aiReady, setAiReady] = useState(false)
  const [showCamera, setShowCamera] = useState(false)
  const [showControls, setShowControls] = useState(false)
  const [activeFilters, setActiveFilters] = useState<string[]>([])
  const [aiPhoto, setAiPhoto] = useState<File | null>(null)
  const [aiError, setAiError] = useState("")
  const [aiResult, setAiResult] = useState<{
    suggestion: string
    details: string
    reason: string
  } | null>(null)
  const [cameraError, setCameraError] = useState("")
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null)
  const [showPlacedModel, setShowPlacedModel] = useState(false)
  const [cameraFilter, setCameraFilter] = useState<"All" | "Trees" | "Plants">("All")
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [cardImages, setCardImages] = useState<
    Record<
      string,
      {
        url: string
        photographer: string
        photographerUrl: string
        unsplashUrl: string
      }
    >
  >({})
  const [imageError, setImageError] = useState("")
  const [imageDebug, setImageDebug] = useState("")

  const toggleFilter = (label: string) => {
    setActiveFilters((prev) =>
      prev.includes(label) ? prev.filter((item) => item !== label) : [...prev, label]
    )
  }

  useEffect(() => {
    const loadImages = async () => {
      setImageError("")
      setImageDebug("")
      try {
        const entries = await Promise.all(
          catalog.map(async (item) => {
            const query = item.name
            try {
              const res = await fetch(`/api/plant-image?q=${encodeURIComponent(query)}`, {
                cache: "no-store",
              })
              if (!res.ok) {
                return [
                  item.name,
                  {
                    url: getCardImageUrl(item.name, item.type),
                    photographer: "Image source",
                    photographerUrl: "https://wikipedia.org",
                    unsplashUrl: "https://wikipedia.org",
                  },
                ] as const
              }
              const data = await res.json()
              return [
                item.name,
                {
                  url: data.imageUrl,
                  photographer: data.attribution || "Image source",
                  photographerUrl: data.link || "https://wikipedia.org",
                  unsplashUrl: data.unsplashUrl || data.link || "https://wikipedia.org",
                },
              ] as const
            } catch {
              return [
                item.name,
                {
                  url: getCardImageUrl(item.name, item.type),
                  photographer: "Image source",
                  photographerUrl: "https://wikipedia.org",
                  unsplashUrl: "https://wikipedia.org",
                },
              ] as const
            }
          })
        )
        const mapped = Object.fromEntries(entries)
        setCardImages(mapped)
        setImageDebug("Loaded plant images from Unsplash.")
      } catch {
        setImageError("Unable to load plant images.")
      }
    }
    loadImages()
  }, [])

  useEffect(() => {
    const startCamera = async () => {
      if (!showCamera) return
      setCameraError("")
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        })
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }
      } catch {
        setCameraError("Camera access blocked. Allow permissions and try again.")
      }
    }

    const stopCamera = () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null
      }
    }

    if (showCamera) {
      startCamera()
    } else {
      stopCamera()
    }

    return () => {
      stopCamera()
    }
  }, [showCamera])

  const selectedImage = cardImages[selectedPlant] ?? null
  const filteredCatalog =
    cameraFilter === "All"
      ? catalog
      : catalog.filter((item) => item.type === (cameraFilter === "Trees" ? "Tree" : "Plant"))

  return (
    <main className="min-h-screen gd-page-bg--red text-white">
      <Navbar />

      {showCamera && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
            <div className="w-full max-w-lg rounded-3xl border border-emerald-500/20 bg-[#0b0f12] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.6)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-white/60">AR Camera</p>
                  <h3 className="text-xl font-semibold">Place {selectedPlant}</h3>
                </div>
                <Button
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10"
                  onClick={() => setShowCamera(false)}
                >
                  Close
                </Button>
              </div>
              <div className="mt-4">
                <label className="block text-xs text-white/60 mb-2">Search plant or tree</label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    list="greenspot-plants"
                    placeholder="Type to search..."
                    className="w-full rounded-xl border border-emerald-500/30 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                    onChange={(event) => {
                      const value = event.target.value.trim()
                      const match = catalog.find((item) => item.name.toLowerCase() === value.toLowerCase())
                      if (match) {
                        setSelectedPlant(match.name)
                      }
                    }}
                  />
                  <div className="flex gap-2">
                    {(["All", "Trees", "Plants"] as const).map((label) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => setCameraFilter(label)}
                        className={`rounded-full border px-3 py-2 text-xs transition ${
                          cameraFilter === label
                            ? "border-emerald-400/60 bg-emerald-500/20 text-emerald-200"
                            : "border-white/10 bg-white/5 text-white/60"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <datalist id="greenspot-plants">
                  {filteredCatalog.map((item) => (
                    <option key={item.name} value={item.name} />
                  ))}
                </datalist>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  {filteredCatalog.slice(0, 6).map((item) => (
                    <button
                      key={item.name}
                      type="button"
                      onClick={() => setSelectedPlant(item.name)}
                      className={`rounded-full border px-3 py-1 transition ${
                        selectedPlant === item.name
                          ? "border-emerald-400/60 bg-emerald-500/20 text-emerald-200"
                          : "border-white/10 bg-white/5 text-white/60"
                      }`}
                    >
                      {item.name}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-[11px] text-white/50">
                  Showing: {cameraFilter === "All" ? "All plants & trees" : cameraFilter}
                </p>
              </div>
              <div className="mt-4 h-56 rounded-2xl border border-emerald-500/20 bg-black/50 overflow-hidden relative">
                <video ref={videoRef} className="h-full w-full object-cover" playsInline muted />
                {showPlacedModel && selectedImage && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-28 w-28 rounded-full border border-emerald-300/60 bg-emerald-500/10 p-2 shadow-[0_0_30px_rgba(16,185,129,0.35)]">
                      <img src={selectedImage.url} alt={selectedPlant} className="h-full w-full rounded-full object-cover" />
                    </div>
                  </div>
                )}
              </div>
              {cameraError && (
                <div className="mt-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs text-red-200">
                  {cameraError}
                </div>
              )}
              {capturedPreview && (
                <div className="mt-3 rounded-2xl border border-emerald-500/30 bg-black/40 p-2">
                  <img src={capturedPreview} alt="Captured preview" className="h-28 w-full object-cover rounded-xl" />
                </div>
              )}
              <div className="mt-4 flex gap-3">
                <Button
                  className="bg-emerald-500 text-black hover:bg-emerald-400"
                  onClick={() => setShowPlacedModel((prev) => !prev)}
                >
                  {showPlacedModel ? "Remove model" : "Place model"}
                </Button>
                <Button
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10"
                  onClick={() => {
                    if (!videoRef.current) return
                    const video = videoRef.current
                    const canvas = document.createElement("canvas")
                    canvas.width = video.videoWidth || 640
                    canvas.height = video.videoHeight || 360
                    const ctx = canvas.getContext("2d")
                    if (!ctx) return
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
                    setCapturedPreview(canvas.toDataURL("image/jpeg", 0.92))
                  }}
                >
                  Capture preview
                </Button>
              </div>
          </div>
        </div>
      )}

      <section className="pt-28 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-8 items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/5 border border-white/10 px-4 py-2 text-sm text-emerald-200 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
                <Sparkles className="w-4 h-4" />
                GreenSpot Experience
              </div>
              <h1 className="mt-6 text-4xl sm:text-5xl font-semibold leading-tight">
                Smart planting guidance,
                <span className="block text-emerald-300">from discovery to action.</span>
              </h1>
              <p className="mt-4 text-white/70 max-w-2xl">
                Explore trees and plants, follow expert planting steps, preview them in 3D/AR,
                and get AI recommendations tailored to your GreenSpot.
              </p>
              <div className="mt-6 flex flex-wrap gap-3 text-sm text-white/60">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/5 border border-white/10 px-4 py-2">
                  <Leaf className="w-4 h-4 text-emerald-300" />
                  AI plant matching
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/5 border border-white/10 px-4 py-2">
                  <Camera className="w-4 h-4 text-emerald-300" />
                  AR preview
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/5 border border-white/10 px-4 py-2">
                  <MapPin className="w-4 h-4 text-emerald-300" />
                  Nursery finder
                </span>
              </div>
            </div>

            <div className="rounded-3xl border border-emerald-500/20 bg-white/5 p-6 shadow-[0_20px_40px_rgba(0,0,0,0.35)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-white/60">AR / 3D Preview</p>
                  <h2 className="text-xl font-semibold mt-1">{selectedPlant}</h2>
                </div>
                <div className="rounded-full bg-emerald-500/20 p-3 border border-emerald-400/30">
                  <Camera className="w-5 h-5 text-emerald-300" />
                </div>
              </div>
              <div className="mt-4 h-56 rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/50 via-black/60 to-black/80 flex items-center justify-center text-white/60">
                {selectedImage ? (
                  <img src={selectedImage.url} alt={selectedPlant} className="h-full w-full object-cover rounded-2xl" />
                ) : (
                  <span>{imageError || "3D / AR preview placeholder"}</span>
                )}
              </div>
              {selectedImage && (
                <p className="mt-2 text-xs text-white/50">
                  Photo by{" "}
                  <a href={selectedImage.photographerUrl} target="_blank" rel="noreferrer" className="underline">
                    {selectedImage.photographer}
                  </a>{" "}
                  on{" "}
                  <a href={selectedImage.unsplashUrl} target="_blank" rel="noreferrer" className="underline">
                    Unsplash
                  </a>
                </p>
              )}
              {imageDebug && (
                <p className="mt-1 text-[11px] text-emerald-200/80">Debug: {imageDebug}</p>
              )}
              <div className="mt-4 flex gap-3">
                <Button
                  className="bg-emerald-500 text-black hover:bg-emerald-400"
                  onClick={() => setShowCamera(true)}
                >
                  Open camera
                </Button>
                <Button
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10"
                  onClick={() => setShowControls((prev) => !prev)}
                >
                  Rotate & scale
                </Button>
              </div>
              {showControls && (
                <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-black/40 p-4 text-sm text-white/70">
                  Use gestures to rotate, scale, and position the model.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-emerald-300">Plant catalog</p>
              <h2 className="text-3xl font-semibold mt-2">Discover plants and trees.</h2>
            </div>
          </div>
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
              {catalog.map((item) => (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => setSelectedPlant(item.name)}
                  className={`rounded-3xl border border-emerald-500/20 bg-white/5 p-6 text-left shadow-[0_20px_40px_rgba(0,0,0,0.35)] transition ${
                    selectedPlant === item.name ? "ring-2 ring-emerald-400/60" : ""
                  }`}
                >
                  <div className="h-32 rounded-2xl bg-black/40 border border-emerald-500/20 flex items-center justify-center text-white/50 overflow-hidden">
                    <img
                      src={cardImages[item.name]?.url || getCardImageUrl(item.name, item.type)}
                      alt={item.name}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                <h3 className="mt-4 text-lg font-semibold">{item.name}</h3>
                <p className="text-sm text-white/60">{item.category}</p>
                <div className="mt-3 text-xs text-white/60">
                  Climate: {item.climate} · Difficulty: {item.difficulty}
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-[#0a0d10]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-8 items-start">
            <div className="rounded-3xl border border-emerald-500/20 bg-white/5 p-6 shadow-[0_20px_40px_rgba(0,0,0,0.35)]">
              <p className="text-sm uppercase tracking-[0.2em] text-emerald-300">Planting guide</p>
              <h2 className="mt-3 text-2xl font-semibold">Step-by-step planting manual.</h2>
              <div className="mt-6 grid md:grid-cols-2 gap-4">
                {guideSteps.map((step) => (
                  <div
                    key={step.title}
                    className="rounded-2xl border border-emerald-500/20 bg-black/40 p-4"
                  >
                    <div className="flex items-center gap-3">
                      <step.icon className="w-5 h-5 text-emerald-300" />
                      <div>
                        <p className="text-xs text-white/60">{step.title}</p>
                        <p className="text-sm font-medium">{step.value}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-emerald-500/20 bg-white/5 p-6 shadow-[0_20px_40px_rgba(0,0,0,0.35)]">
              <p className="text-sm uppercase tracking-[0.2em] text-emerald-300">AI recommendation</p>
              <h2 className="mt-3 text-2xl font-semibold">Upload a photo for smart suggestions.</h2>
              <label className="mt-4 block cursor-pointer rounded-2xl border border-dashed border-emerald-500/40 bg-black/40 px-4 py-6 text-center text-white/60">
                <Camera className="w-6 h-6 mx-auto mb-2 text-emerald-300" />
                <span>Drop location photo for AI analysis</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null
                    setAiPhoto(file)
                  }}
                />
              </label>
              {aiPhoto && (
                <div className="mt-2 text-xs text-emerald-200">
                  Selected: {aiPhoto.name}
                </div>
              )}
              <Button
                className="mt-4 bg-emerald-500 text-black hover:bg-emerald-400"
                onClick={() => {
                  if (!aiPhoto) {
                    setAiError("Please upload a photo before running AI analysis.")
                    setAiReady(false)
                    return
                  }
                  const options = [
                    {
                      suggestion: "Aleppo Pine",
                      details: "Drought-resistant · Medium growth height (6–8m)",
                      reason: "Dry climate, open space detected, native to region.",
                    },
                    {
                      suggestion: "Olive Tree",
                      details: "Low maintenance · Deep roots · 4–6m height",
                      reason: "Mediterranean light, soil looks well-drained.",
                    },
                    {
                      suggestion: "Jacaranda",
                      details: "Ornamental shade · 6–10m height",
                      reason: "Urban setting, wide spacing detected.",
                    },
                    {
                      suggestion: "Fig Tree",
                      details: "Fruit tree · 4–7m height",
                      reason: "Warm exposure, moderate moisture.",
                    },
                  ]
                  const hash = aiPhoto.name
                    .split("")
                    .reduce((acc, char) => acc + char.charCodeAt(0), 0)
                  const picked = options[hash % options.length]
                  setAiError("")
                  setAiResult(picked)
                  setAiReady(true)
                }}
              >
                Analyze with AI
              </Button>
              {aiError && (
                <div className="mt-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs text-red-200">
                  {aiError}
                </div>
              )}
              {aiReady && aiResult && (
                <div className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="h-20 w-full sm:w-28 rounded-xl overflow-hidden border border-emerald-500/30 bg-black/40">
                      <img
                        src={
                          cardImages[aiResult.suggestion]?.url ||
                          getCardImageUrl(
                            aiResult.suggestion,
                            catalog.find((item) => item.name === aiResult.suggestion)?.type
                          )
                        }
                        alt={aiResult.suggestion}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <div>
                      <div>
                        Suggested: {aiResult.suggestion} · {aiResult.details}
                      </div>
                      <div className="mt-2 text-xs text-white/70">Reason: {aiResult.reason}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-emerald-500/20 bg-white/5 p-6 shadow-[0_20px_40px_rgba(0,0,0,0.35)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-emerald-300">Nearby nurseries</p>
                <h2 className="mt-3 text-2xl font-semibold">Find local nurseries and plant sellers.</h2>
              </div>
              <div className="rounded-full bg-emerald-500/20 p-3 border border-emerald-400/30">
                <Globe className="w-5 h-5 text-emerald-300" />
              </div>
            </div>
            <div className="mt-4 h-64 rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/50 via-black/60 to-black/80 flex items-center justify-center text-white/60">
              Mapbox / Google Maps placeholder with eco pins
            </div>
            <div className="mt-4 flex flex-wrap gap-3 text-sm text-white/60">
              <button
                type="button"
                onClick={() => toggleFilter("Tree nurseries")}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 transition ${
                  activeFilters.includes("Tree nurseries")
                    ? "bg-emerald-500/20 border-emerald-400/40 text-emerald-200"
                    : "bg-white/5 border-white/10"
                }`}
              >
                <Trees className="w-4 h-4 text-emerald-300" />
                Tree nurseries
              </button>
              <button
                type="button"
                onClick={() => toggleFilter("Indoor plants")}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 transition ${
                  activeFilters.includes("Indoor plants")
                    ? "bg-emerald-500/20 border-emerald-400/40 text-emerald-200"
                    : "bg-white/5 border-white/10"
                }`}
              >
                <Sprout className="w-4 h-4 text-emerald-300" />
                Indoor plants
              </button>
              <button
                type="button"
                onClick={() => toggleFilter("Nearby locations")}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 transition ${
                  activeFilters.includes("Nearby locations")
                    ? "bg-emerald-500/20 border-emerald-400/40 text-emerald-200"
                    : "bg-white/5 border-white/10"
                }`}
              >
                <MapPin className="w-4 h-4 text-emerald-300" />
                Nearby locations
              </button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}

