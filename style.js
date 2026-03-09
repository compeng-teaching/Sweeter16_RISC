// Mode switching for left column (Code vs Info)
function setupLeftColumnModeSwitching() {
    const leftColumn = document.getElementById('leftColumn');
    const originalCodeTab = document.getElementById('tabOriginalCode');
    const dealiasCodeTab = document.getElementById('tabDealiasCode');
    const tabButtons = document.querySelectorAll('#tabButtons .tab-btn');
    
    // Function to switch to CODE mode
    function switchToCodeMode() {
        leftColumn.classList.remove('mode-info');
        leftColumn.classList.add('mode-code');
        
        // Update active state of code tabs
        if (originalCodeTab && dealiasCodeTab) {
            // Keep the current active code tab as is
        }
    }
    
    // Function to switch to INFO mode
    function switchToInfoMode() {
        leftColumn.classList.remove('mode-code');
        leftColumn.classList.add('mode-info');
    }
    
    // When any info tab (Sample Programs, Instruction Set, etc.) is clicked
    tabButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            switchToInfoMode();
        });
    });
    
    // When code tabs are clicked, switch to code mode
    if (originalCodeTab) {
        originalCodeTab.addEventListener('click', function() {
            switchToCodeMode();
        });
    }
    
    if (dealiasCodeTab) {
        dealiasCodeTab.addEventListener('click', function() {
            switchToCodeMode();
        });
    }
    
    // Also switch to code mode when user starts typing in textarea
    const inputASM = document.getElementById('InputASM');
    if (inputASM) {
        inputASM.addEventListener('focus', function() {
            switchToCodeMode();
        });
    }
    
    // Start in code mode by default
    switchToCodeMode();
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    setupLeftColumnModeSwitching();
});