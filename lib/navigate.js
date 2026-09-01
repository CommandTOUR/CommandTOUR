// Centralized navigation helper
// Usage in any component:
// import { buildNavEntry } from '@/lib/navigate'
// pushNav(buildNavEntry('/tours/x', 'HWSS International', 'tour'))
// router.push('/tours/x')

export function buildNavEntry(href, label, type = 'page') {
  return { href, label, type }
}

// Root pages that clear the nav stack when visited
export const ROOT_PAGES = [
  '/',
  '/tours',
  '/staff',
  '/venues',
  '/calendar',
  '/bc',
  '/reports',
  '/settings',
]

export function isRootPage(pathname) {
  return ROOT_PAGES.includes(pathname)
}
