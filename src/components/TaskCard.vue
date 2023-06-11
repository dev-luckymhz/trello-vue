<template>
  <div class="bg-white shadow rounded px-3 pt-3 pb-5 border border-white">
    <div class="flex justify-between">
      <p class="text-gray-700 font-semibold font-sans tracking-wide text-sm">{{ task.title }}</p>

      <img class="w-6 h-6 rounded-full ml-3" :src="task.url" alt="Avatar">
    </div>
    <div class="flex mt-4 justify-between items-center">
      <span class="text-sm text-gray-600">{{ task.date }}</span>
      <badge v-if="task.type" :color="badgeColor">{{ task.type }}</badge>
    </div>
    <div class="flex justify-end mt-4">

      <button class="text-sm text-red-500 hover:text-red-700" @click="deleteTask(task)">Delete</button>
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
        }
      })
      // const newTitle = prompt("Enter the new task title:", task.title);
      // if (newTitle) {
      //   task.title = newTitle;
      // }
    },
    deleteTask(column, task) {
      // Implement the logic to delete a task
      this.$swal.fire({
        title: 'Are you sure?',
        text: "You won't be able to revert this!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, delete it!'
      }).then((result) => {
        if (result.isConfirmed) {
          const index = column.tasks.indexOf(task);
          if (index !== -1) {
            column.tasks.splice(index, 1);
          }
          this.$swal.fire(
              'Deleted!',
              'Your file has been deleted.',
              'success'
          )
        }
      })

    }
  }
};
</script>
