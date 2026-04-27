
<template>
    <input type="file" id="tutor_list" multiple @change="readFileUpload"/>
    <pre v-if="content">{{ content }}</pre>
</template>

<script>
import {ref} from 'vue';


export default {
  // `setup` is a special hook dedicated for the Composition API.
  setup() {
    var content = ref("") 


    const readFileUpload = async (event) => {
        const file = event.target.files[0]; // Get the first selected file
        if (file) {
            try {
                content.value = await file.text(); // Read file as text
                console.log(content);
            } catch (err) {
                console.error('Error reading file:', err);
            }
        }
    }
    // expose the ref to the template
    return {
        content,
        readFileUpload
    }
    }
}   
</script>