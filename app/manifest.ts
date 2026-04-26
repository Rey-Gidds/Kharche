import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    'name' : 'Kharche',
    'short_name' : 'Kharche',
    'description' : 'Manage your multi-currency expenses with style.',
    'start_url' : '/',
    'display' : 'standalone',
    'background_color' : '#000000',
    'theme_color' : '#000000',
    'icons' : [
      {
        'src' : '/logo.png',
        'sizes' : 'any',
        'type' : 'image/png',
      },
    ]
  }
}
