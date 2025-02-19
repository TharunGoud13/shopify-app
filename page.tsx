'use client'

import { useState, useEffect } from 'react'
import CategorySelector from './CategorySelector'

interface Category {
  id: string
  name: string
  fully_qualified_type: string
}

export default function Home() {
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)

  useEffect(() => {
    fetch('https://shopify.github.io/product-taxonomy/releases/unstable/search_index.json')
      .then(response => response.json())
      .then(data => {
        const formattedCategories = data.map((item: any) => ({
          id: item.category.id,
          name: item.category.name,
          fully_qualified_type: item.category.fully_qualified_type
        }))
        setCategories(formattedCategories)
      })
  }, [])

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategoryId(categoryId)
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Category Selector</h1>
      <CategorySelector categories={categories} onSelect={handleCategorySelect} />
      {selectedCategoryId && (
        <p className="mt-4">Selected Category ID: {selectedCategoryId}</p>
      )}
    </div>
  )
}

