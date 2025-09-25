<script setup lang="ts">
import { queryCollection, useRoute } from '#imports'

const route = useRoute()
const { data: page } = await useAsyncData(`page-${route.path}`, () => {
  return queryCollection('content').path(route.path).first()
})
if (page.value?.ogImage) {
  defineOgImage(page.value?.ogImage) // <-- Nuxt OG Image
}
// Ensure the schema.org is rendered
useHead(page.value.head || {}) // <-- Nuxt Schema.org
useSeoMeta(page.value.seo || {}) // <-- Nuxt Robots
</script>
