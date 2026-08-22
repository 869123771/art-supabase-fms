import type { Component } from 'vue'
import { bootstrapPlatformApp } from '@/bootstrap'
import { registerApplicationViewModules } from '@/router/core/ComponentLoader'

type RouteComponentModule = { default: Component }

const fmsSourceRoot = './views'
const fmsModules = import.meta.glob<RouteComponentModule>([
  './views/**/*.vue',
  '!./views/**/modules/**/*.vue',
  '!./views/**/components/**/*.vue'
])

registerApplicationViewModules('fms', fmsSourceRoot, fmsModules)
bootstrapPlatformApp()
