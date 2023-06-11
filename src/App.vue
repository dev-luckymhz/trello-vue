<template>
  <div class="min-w-full min-h-screen h-screen overflow-hidden bg-blue-100">
  <Header/>
  <div class="flex mt-3 mx-4 space-x-4">
    <div v-for="column in columns" :key="column.title" class="flex flex-col bg-blue-400 p-4 rounded-lg">
      <h2 class="text-lg font-bold mb-4">{{ column.title }}</h2>
      <div class="flex flex-col space-y-4">
        <draggable :list="column.tasks" :animation="200" ghost-class="ghost-card" group="tasks">
        <task-card
            v-for="(task) in column.tasks"
            :key="task.id"
            :task="task"
            class="mt-3 cursor-move"
            group="task"
            @start="drag=true"
            @end="drag=false"
        ></task-card>
            <button  slot="footer" class="mt-4 py-2 px-4 bg-green-300 text-white rounded-md hover:bg-blue-700" @click="addTask(column)" >Add Task</button>
        </draggable>
      </div>
    </div>
  </div>
  </div>
</template>

<script>
import { VueDraggableNext } from 'vue-draggable-next';
import Header from "./components/header.vue";
import TaskCard from "./components/TaskCard.vue";
export default {
  name: "App",
  components: {
    TaskCard,
    Header,
    draggable : VueDraggableNext
  },
  data() {
    return {
      columns: [
        {
          title: "Backlog",
          tasks: [
            {
              id: 654654,
              title: "Add discount code to checkout page",
              date: "2023-06-22",
              type: "Feature Request",
              url:"https://randomuser.me/api/portraits/men/75.jpg"
            },
            {
              id: 145687,
              title: "Provide documentation on integrations",
              date: "2023-07-53",
              url:"https://randomuser.me/api/portraits/men/76.jpg"
            }
          ]
        },
        {
          title: "In Progress",
          tasks: [
            {
              id: 646545,
              title: "Design shopping cart dropdown",
              date: "2023-01-25",
              type: "Design",
              url:"https://randomuser.me/api/portraits/men/76.jpg"
            }
          ]
        },
        {
          title: "Review",
          tasks: [
            {
              id: 956746,
              title: "Provide documentation on integrations",
              date: "2023-06-18",
              url:"https://randomuser.me/api/portraits/men/75.jpg"
            },
          ]
        },
        {
          title: "Done",
          tasks: [
            {
              id: 456546,
              title: "Add discount code to checkout page",
              date: "2023-06-27",
              type: "Feature Request",
              url:"https://randomuser.me/api/portraits/men/78.jpg"
            },
          ]
        }
      ]
    };
  },
  methods: {
    addTask(column) {
      const newTask = {
        id: Date.now(), // Generate a unique ID for the new task
        title: "New Task",
        date: "",
        type: ""
      };
      this.$swal.fire({
        title: 'Create a task',
        showCancelButton: true,
        confirmButtonText: 'Save Task',
        showLoaderOnConfirm: true,
        width: 600,
        html:
            '<input id="title-input" type="text" class="swal2-input" placeholder="enter Task Title">' +
            '<input id="date-input" type="date" class="swal2-input ">'+
            '<select id="type-input" class="swal2-input shadow"> ' +
            ' <option value="design">choose a type</option>' +
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
          newTask.title = result.value[0];
          newTask.date = result.value[1];
          newTask.type = result.value[2];
          console.log(newTask)
          column.tasks.push(newTask);
        }
      })
      // const newTitle = prompt("Enter the new task title:", newTask.title);
      if (newTitle) {
        newTask.title = newTitle;
      column.tasks.push(newTask);
      }
    }
  }
};
</script>

<style>
/* Add styles for the task-board component */
</style>
