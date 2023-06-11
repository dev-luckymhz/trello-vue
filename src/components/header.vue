<template>
  <div class="flex mx-4 mt-5 px-3 pt-3 pb-5 flex-initial justify-between">
    <div class="flex items-center">
      <h4 class="text-4xl font-bold text-gray-600">Studio Board</h4>
    </div>

    <ul class="flex space-x-3">
      <li>
        <img
            src="https://randomuser.me/api/portraits/men/75.jpg"
            width="36"
            height="36"
            objectFit="cover"
            class=" rounded-full "
        />
      </li>
      <li>
        <img
            src="https://randomuser.me/api/portraits/men/76.jpg"
            width="36"
            height="36"
            objectFit="cover"
            class=" rounded-full "
        />
      </li>
      <li>
        <img
            src="https://randomuser.me/api/portraits/men/78.jpg"
            width="36"
            height="36"
            objectFit="cover"
            class=" rounded-full "
        />
      </li>
      <li>
        <button
            class="border border-dashed flex items-center w-9 h-9 border-gray-500 justify-center
                rounded-full"
        >
        </button>
      </li>
    </ul>
  </div>
</template>

<script>
export default {
  name: "header"
}
</script>

<style scoped>

</style>