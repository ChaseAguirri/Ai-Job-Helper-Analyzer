document.addEventListener("DOMContentLoaded", () => {
    // Clear previous form data and analysis flag on fresh load to prevent auto-redirect
    localStorage.removeItem('formData');
    sessionStorage.removeItem('analysisDone'); // 🆕 Added line to allow regeneration after going home
  
    const resumeInput = document.getElementById('resume-upload');
    const generateBtn = document.getElementById('generateBtn');
    const loadingContainer = document.getElementById('loadingContainer');
    const loadingBar = document.getElementById('loadingBar');
    const loadingText = document.getElementById('loadingText');
  
    const tipToggle = document.querySelector('.tip-toggle');
    const modal = document.getElementById('instructionModal');
    const modalCloseBtn = document.getElementById('modalCloseBtn');
  
    // Create or get error message container
    let errorContainer = document.getElementById('errorContainer');
    if (!errorContainer) {
      errorContainer = document.createElement('div');
      errorContainer.id = 'errorContainer';
      document.querySelector('.container').prepend(errorContainer);
    }
  
    function showError(message) {
      errorContainer.textContent = message;
      errorContainer.classList.add('show');
      // Remove after 2.5s
      setTimeout(() => {
        errorContainer.classList.remove('show');
      }, 2500);
    }
  
    tipToggle.addEventListener('click', () => {
      modal.classList.remove('hidden');
    });
  
    modalCloseBtn.addEventListener('click', () => {
      modal.classList.add('hidden');
    });
  
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.add('hidden');
      }
    });
  
    generateBtn.addEventListener('click', async () => {
      if (resumeInput.files.length === 0) {
        showError('Please upload a resume file first.');
        return;
      }
  
      const jobDescription = document.getElementById('job-listing').value.trim();
      if (!jobDescription) {
        showError('Please enter a job listing information.');
        return;
      }
  
      loadingContainer.style.display = 'block';
      loadingBar.value = 0;
      loadingText.textContent = '0%';
      generateBtn.disabled = true;
  
      const file = resumeInput.files[0];
      const formData = new FormData();
      formData.append('resume', file);
  
      try {
        let progress = 0;
        const progressInterval = setInterval(() => {
          progress = Math.min(progress + 5, 85);
          loadingBar.value = progress;
          loadingText.textContent = `${progress}%`;
        }, 300);
  
        const uploadRes = await fetch('http://localhost:3000/upload-resume', {
          method: 'POST',
          body: formData,
        });
  
        clearInterval(progressInterval);
        loadingBar.value = 90;
        loadingText.textContent = '90%';
  
        if (!uploadRes.ok) {
          throw new Error('Failed to upload and parse resume.');
        }
  
        const json = await uploadRes.json();
  
        if (!json || typeof json.resumeText !== 'string' || !json.resumeText.trim()) {
          throw new Error('Invalid resume data received from server.');
        }
  
        const resumeText = json.resumeText;
  
        loadingBar.value = 100;
        loadingText.textContent = '100%';
  
        const options = [];
        if (document.getElementById('tailor-resume').checked) options.push('Tailor Resume');
        if (document.getElementById('write-cover').checked) options.push('Write Cover Letter');
        if (document.getElementById('generate-summary').checked) options.push('Generate Job Summary');
  
        const formDataToSave = {
          resumeText: resumeText.trim(),
          jobDescription,
          options: options.length > 0 ? options : ['None'],
          resumeFileName: file.name
        };
  
        localStorage.setItem('formData', JSON.stringify(formDataToSave));
  
        setTimeout(() => {
          window.location.href = 'results.html';
        }, 600);
  
      } catch (error) {
        console.error('Upload error:', error);
        showError('An error occurred: ' + error.message);
        loadingContainer.style.display = 'none';
        generateBtn.disabled = false;
      }
    });
  });
  