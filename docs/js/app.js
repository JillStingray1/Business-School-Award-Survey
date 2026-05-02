// Vue state, validation rules, and event handlers.
const { createApp, reactive, ref, computed, onMounted } = Vue

createApp({
  setup() {
    const { dbFields, themeOverrides } = window.AppConfig
    const { getWordCount, formatDateTime, makeScholarOption } = window.AppUtils

    const formRef = ref(null)
    const submitting = ref(false)
    const submitted = ref(false)
    const periodChecking = ref(true)
    const nominationOpen = ref(false)
    const periodClosedMessage = ref("Current nominations are not open.")
    const activePeriod = ref(null)
    const scholarLoading = ref(false)
    const selectedScholar = ref(null)
    const scholarOptions = ref([])
    const unitSearchLoading = ref(false)
    const unitSearchPerformed = ref(false)
    const unitResults = ref([])
    const lastUnitSearchQuery = ref("")

    let debounceTimer = null
    let unitSearchTimer = null

    const form = reactive({
      studentName: "",
      studentId: "",
      scholarId: null,
      unitCode: "",
      unitName: "",
      teachingPeriod: "",
      roleOfUnit: "",
      statementSupport: ""
    })

    const statementWordCount = computed(() => getWordCount(form.statementSupport))

    const selectedScholarInfo = computed(() => {
      if (!selectedScholar.value) return ""
      const s = selectedScholar.value
      return [s.name, s.unit, s.unit_name, s.teaching_period, s.role_of_unit].filter(Boolean).join(" · ")
    })

    function getScholarId(scholar) {
      return scholar?.[dbFields.scholarPrimaryKey]
    }

    function toScholarOption(scholar) {
      return makeScholarOption(scholar, dbFields.scholarPrimaryKey)
    }

    function ensureScholarOption(scholar) {
      const scholarId = getScholarId(scholar)
      const exists = scholarOptions.value.some((option) => option.value === scholarId)

      if (!exists) {
        scholarOptions.value = [toScholarOption(scholar), ...scholarOptions.value]
      }
    }

    const requiredMessage = (message) => ({
      required: true,
      message,
      trigger: ["input", "blur"]
    })

    const rules = {
      studentName: [requiredMessage("Please enter your student name.")],
      studentId: [requiredMessage("Please enter your student ID.")],
      scholarId: [
        {
          validator: (_, value) => value ? true : new Error("Please select a nominee from the list."),
          trigger: ["change", "blur"]
        }
      ],
      unitCode: [requiredMessage("Please enter the unit code.")],
      unitName: [requiredMessage("Please enter the unit name.")],
      teachingPeriod: [requiredMessage("Please enter the teaching period.")],
      roleOfUnit: [requiredMessage("Please enter the role of this unit.")],
      statementSupport: [
        {
          validator: (_, value) => {
            if (!value || getWordCount(value) < 25) {
              return new Error("Please write a statement of at least 25 words.")
            }
            return true
          },
          trigger: ["input", "blur"]
        }
      ]
    }

    async function checkNominationPeriod() {
      periodChecking.value = true
      nominationOpen.value = false
      activePeriod.value = null
      periodClosedMessage.value = "Current nominations are not open."

      try {
        const now = new Date()
        const nowIso = now.toISOString()

        // Step 1: Ask Supabase for an award period that is active AND open right now.
        // This avoids accidentally selecting a future active period when there are multiple rows.
        const openPeriod = await window.ApiClient.getOpenAwardPeriod(nowIso)

        console.log("Nomination period check", {
          browserTimeLocal: now.toString(),
          browserTimeUTC: nowIso,
          openPeriod
        })

        if (openPeriod) {
          activePeriod.value = openPeriod
          nominationOpen.value = true
          periodClosedMessage.value = ""
          return
        }

        // Step 2: If no period is open right now, fetch active periods only for the message.
        const activePeriods = await window.ApiClient.getActiveAwardPeriods()

        console.log("Active award periods", activePeriods)

        if (activePeriods.length === 0) {
          periodClosedMessage.value = "There is currently no active award period for nominations."
          return
        }

        const futurePeriods = activePeriods
          .filter((p) => new Date(p.nomination_open_at) > now)
          .sort((a, b) => new Date(a.nomination_open_at) - new Date(b.nomination_open_at))

        const closedPeriods = activePeriods
          .filter((p) => new Date(p.nomination_close_at) <= now)
          .sort((a, b) => new Date(b.nomination_close_at) - new Date(a.nomination_close_at))

        const displayPeriod = futurePeriods[0] || closedPeriods[0] || activePeriods[0]
        activePeriod.value = displayPeriod

        if (futurePeriods[0]) {
          periodClosedMessage.value = `Nominations are not open yet. They will open on ${formatDateTime(displayPeriod.nomination_open_at)}.`
        } else if (closedPeriods[0]) {
          periodClosedMessage.value = `Nominations for the current award period closed on ${formatDateTime(displayPeriod.nomination_close_at)}.`
        } else {
          periodClosedMessage.value = "Current nominations are not open. Please check the nomination opening and closing times."
        }
      } catch (err) {
        console.error(err)
        periodClosedMessage.value = "The nomination period could not be checked. Please try again later."
      } finally {
        periodChecking.value = false
      }
    }

    async function fetchScholars(query) {
      scholarLoading.value = true

      try {
        const data = await window.ApiClient.searchScholarsByName(query)
        scholarOptions.value = data.map(toScholarOption)
      } catch (err) {
        scholarOptions.value = []
        console.error(err)
      } finally {
        scholarLoading.value = false
      }
    }

    async function searchByUnitCode() {
      const query = String(form.unitCode || "").trim()

      clearTimeout(unitSearchTimer)
      if (!query) {
        unitResults.value = []
        unitSearchPerformed.value = false
        lastUnitSearchQuery.value = ""
        return
      }

      unitSearchLoading.value = true
      unitSearchPerformed.value = true
      lastUnitSearchQuery.value = query.toUpperCase()

      try {
        const data = await window.ApiClient.searchScholarsByUnit(query)
        unitResults.value = data

        if (unitResults.value.length > 0) {
          scholarOptions.value = unitResults.value.map(toScholarOption)
        }
      } catch (err) {
        unitResults.value = []
        console.error(err)
      } finally {
        unitSearchLoading.value = false
      }
    }

    function handleUnitCodeInput(value) {
      clearTimeout(unitSearchTimer)

      const query = String(value || "").trim()
      if (query.length < 3) {
        unitResults.value = []
        unitSearchPerformed.value = false
        lastUnitSearchQuery.value = ""
        return
      }

      unitSearchTimer = setTimeout(searchByUnitCode, 500)
    }

    function applyScholarToForm(scholar) {
      if (!scholar) return

      ensureScholarOption(scholar)
      selectedScholar.value = scholar
      form.scholarId = getScholarId(scholar)

      if (scholar.unit) form.unitCode = scholar.unit
      if (scholar.unit_name) form.unitName = scholar.unit_name
      if (scholar.teaching_period) form.teachingPeriod = scholar.teaching_period
      if (scholar.role_of_unit) form.roleOfUnit = scholar.role_of_unit
    }

    function selectRelatedScholar(scholar) {
      applyScholarToForm(scholar)
    }

    function handleScholarSearch(query) {
      selectedScholar.value = null
      form.scholarId = null

      clearTimeout(debounceTimer)
      if (!query || query.trim().length < 2) {
        scholarOptions.value = []
        return
      }

      debounceTimer = setTimeout(() => fetchScholars(query.trim()), 300)
    }

    function handleScholarSelect(value) {
      if (!value) {
        selectedScholar.value = null
        return
      }

      const selectedOption = scholarOptions.value.find((option) => option.value === value)
      if (!selectedOption) return

      applyScholarToForm(selectedOption.scholar)
    }

    async function submitNomination() {
      try {
        await formRef.value?.validate()
      } catch (validationError) {
        return
      }

      if (!selectedScholar.value) return

      submitting.value = true

      try {
        await window.ApiClient.submitNomination({
          student_name: form.studentName.trim(),
          student_id: form.studentId.trim(),
          [dbFields.nominationScholarField]: getScholarId(selectedScholar.value),
          scholar_name: selectedScholar.value.name,
          unit_code: form.unitCode.trim(),
          unit_name: form.unitName.trim(),
          teaching_period: form.teachingPeriod.trim(),
          role_of_unit: form.roleOfUnit.trim(),
          statement_support: form.statementSupport.trim()
        })

        submitted.value = true
      } catch (err) {
        console.error(err)
        alert("Something went wrong. Please try again.")
      } finally {
        submitting.value = false
      }
    }

    function resetForm() {
      form.studentName = ""
      form.studentId = ""
      form.scholarId = null
      form.unitCode = ""
      form.unitName = ""
      form.teachingPeriod = ""
      form.roleOfUnit = ""
      form.statementSupport = ""
      selectedScholar.value = null
      scholarOptions.value = []
      unitResults.value = []
      unitSearchPerformed.value = false
      lastUnitSearchQuery.value = ""
      submitted.value = false
      formRef.value?.restoreValidation()
    }

    onMounted(checkNominationPeriod)

    return {
      dbFields,
      formRef,
      form,
      rules,
      themeOverrides,
      submitting,
      submitted,
      periodChecking,
      nominationOpen,
      periodClosedMessage,
      activePeriod,
      scholarLoading,
      scholarOptions,
      selectedScholar,
      selectedScholarInfo,
      unitSearchLoading,
      unitSearchPerformed,
      unitResults,
      lastUnitSearchQuery,
      statementWordCount,
      handleScholarSearch,
      handleScholarSelect,
      handleUnitCodeInput,
      searchByUnitCode,
      selectRelatedScholar,
      submitNomination,
      resetForm,
      formatDateTime
    }
  }
}).use(naive).mount("#app")
