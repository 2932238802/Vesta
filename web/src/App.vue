<template>
  <RouterView />
  <ConfirmHost />
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router'
import ConfirmHost from './components/ConfirmHost.vue'
</script>
