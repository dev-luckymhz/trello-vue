<template>
  <div class="bg-white shadow rounded px-3 pt-3 pb-5 min-w-[300px] border border-white">
    <div class="flex justify-between">
      <p class="text-gray-700 font-semibold font-sans tracking-wide text-sm">{{ task.title }}</p>

      <img class="w-6 h-6 rounded-full ml-3" :src="task.url" alt="Avatar">
    </div>
    <div class="flex mt-4 justify-between items-center">
      <span class="text-sm text-gray-600">{{ task.date }}</span>
      <div class="flex flex-row">
      <font-awesome-icon icon="fa-solid fa-trash"  class="text-sm text-red-300 hover:text-red-500 cursor-pointer" @click="toggleDelete" />
      <font-awesome-icon icon="fa-solid fa-pencil" class="text-sm text-green-300 mx-2 hover:text-green-500 cursor-pointer"  @click="editTask(task)" />
      </div>
      <badge v-if="task.type" :color="badgeColor">{{ task.type }}</badge>
    </div>
    <div class="flex justify-end mt-4">

    </div>
  </div>
</template>

<script>
import Badge from "./Badge.vue";
export default {
  components: {
    Badge
  },
  props: {
    task: {
      type: Object,
      default: () => ({})
    }
  },
  computed: {
    badgeColor() {
      const mappings = {
        Design: "purple",
        "Feature Request": "teal",
        Backend: "blue",
        QA: "green",
        default: "teal"
      };
      return mappings[this.task.type] || mappings.default;
    }
  },
  methods : {
    editTask(task) {
      // Implement the logic to edit a task
      // alert(task.date)
      this.$swal.fire({
        title: 'Create a task',
        showCancelButton: true,
        confirmButtonText: 'Save Task',
        showLoaderOnConfirm: true,
        width: 600,
        html:
            '<input id="title-input" type="text" value="'+task.title+'" class="swal2-input" placeholder="enter Task Title">' +
            '<input id="date-input" type="date" value="'+task.date+'" class="swal2-input ">'+
            '<select id="type-input" class="swal2-input shadow">'+
            ' <option value="'+task.type+'">choose a type</option>'+
            ' <option value="design">Design</option>' +
            ' <option value="QA">Q&A</option>' +
            ' <option value="Feature Request">Feature Request</option>' +
            '</select>',
        preConfirm: function () {
          return new Promise(function (resolve) {
            resolve([
              document.getElementById("title-input").value,
              document.getElementById("date-input").value,
              document.getElementById("type-input").value,
            ])
          })
        },
      }).then((result) => {
        if (result) {
          task.title = result.value[0];
          task.date = result.value[1];
          task.type = result.value[2];
          this.$swal.fire(
              'Updated!',
              'The Task was updated.',
              'success'
          )
        }
      })
    },
    toggleDelete() {
      this.$emit('toggle-delete');
    }
  }
};
</script>
