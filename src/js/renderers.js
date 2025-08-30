// Framework rendering functions

function getFrameworkImage(shortName) {
    const mappings = {
        'ecf': 'ecf.png',
        'cshrtn': 'cshrtn.png',
        'dcf': 'dcf.png',
        'cf': 'cf.png',
        'iscf': 'iscf.png',
        'cshrtn2': 'cshrtn2.png',
        'gdpr': 'gpdr.png'
    };
    return mappings[shortName.toLowerCase()] ? `/public/images/${mappings[shortName.toLowerCase()]}` : '/public/images/cf.png';
}

export function renderFrameworkItem(item) {
    const li = document.createElement('li');
    // Normalize item fields in case service returns different keys
    const id = item.id ?? item._id ?? item.slug ?? String(item.name || '');
    const name = item.name ?? item.title ?? id;
    const shortName = item.shortName ?? name;
    const description = item.description ?? item.subtitle ?? '';
    const status = item.status ?? '';

    // Map status to display text and CSS class
    const statusMapping = {
        'published': { text: 'Published', class: 'status-published', icon: '✓' },
        'ready-to-publish': { text: 'Ready to Publish', class: 'status-ready-to-publish', icon: 'ⓘ' },
        'ready-to-map': { text: 'Ready to Map', class: 'status-ready-to-map', icon: 'ⓘ' },
        'mapping-in-progress': { text: 'Mapping in Progress', class: 'status-mapping-in-progress', icon: 'ⓘ' },
        'mapping-failed': { text: 'Mapping Failed', class: 'status-mapping-failed', icon: '✗' },
        'deactivated': { text: 'Deactivated', class: 'status-deactivated', icon: '⊘' },
        'draft': { text: 'Draft', class: 'status-draft', icon: '◐' }
    };

    const statusInfo = statusMapping[status] || { text: status, class: 'status-default', icon: '◐' };

    // Create the anchor element
    const anchor = document.createElement('a');
    anchor.className = 'framework-item';
    anchor.dataset.id = id;
    anchor.href = `/framework/${encodeURIComponent(id)}`;
    anchor.setAttribute('aria-label', `Open ${name}`);

    // Create main container
    const mainDiv = document.createElement('div');
    mainDiv.className = 'item-container';

    // Create avatar
    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'avatar';
    const imgElement = document.createElement('img');
    imgElement.src = getFrameworkImage(shortName);
    imgElement.alt = name;
    imgElement.className = 'framework-icon';
    avatarDiv.appendChild(imgElement);

    // Create content container
    const contentDiv = document.createElement('div');
    contentDiv.className = 'item-content';

    // Create category label (this will show "Custom Framework" or "System Framework")
    const categoryDiv = document.createElement('div');
    categoryDiv.className = 'item-category';
    categoryDiv.textContent = item.isEnterprise ? 'Enterprise Framework' : 'Custom Framework';
    contentDiv.appendChild(categoryDiv);

    // Create header row
    const headerDiv = document.createElement('div');
    headerDiv.className = 'item-header';

    // Create name element (using shortName for display)
    const nameDiv = document.createElement('div');
    nameDiv.className = 'item-title';
    nameDiv.textContent = shortName;
    headerDiv.appendChild(nameDiv);

    // Create subtitle (description)
    const subtitleDiv = document.createElement('div');
    subtitleDiv.className = 'item-subtitle';
    subtitleDiv.textContent = description;
    // Place subtitle within the same header container as title
    headerDiv.appendChild(subtitleDiv);

    // Create status chip if status exists
    if (status) {
        const statusDiv = document.createElement('div');
        statusDiv.className = `item-status ${statusInfo.class}`;

        // Create status icon
        const statusIconDiv = document.createElement('div');
        statusIconDiv.className = 'status-icon';
        statusDiv.appendChild(statusIconDiv);

        // Create status text
        const statusTextDiv = document.createElement('div');
        statusTextDiv.className = 'status-text';
        statusTextDiv.textContent = statusInfo.text;
        statusDiv.appendChild(statusTextDiv);

        anchor.appendChild(statusDiv);
    }

    // Assemble the structure
    contentDiv.appendChild(headerDiv);
    mainDiv.appendChild(avatarDiv);
    mainDiv.appendChild(contentDiv);
    anchor.appendChild(mainDiv);
    li.appendChild(anchor);

    return li;
}

export function renderSkeletonItem() {
    const li = document.createElement('li');

    // Create the anchor element with skeleton class
    const anchor = document.createElement('a');
    anchor.className = 'framework-item skeleton';

    // Create main container
    const mainDiv = document.createElement('div');
    mainDiv.className = 'item-container';

    // Create skeleton avatar
    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'avatar';

    // Create skeleton content container
    const contentDiv = document.createElement('div');
    contentDiv.className = 'item-content';

    // Create skeleton category label
    const categoryDiv = document.createElement('div');
    categoryDiv.className = 'item-category';
    categoryDiv.textContent = 'Loading...';
    contentDiv.appendChild(categoryDiv);

    // Create skeleton header row
    const headerDiv = document.createElement('div');
    headerDiv.className = 'item-header';

    // Create skeleton title
    const nameDiv = document.createElement('div');
    nameDiv.className = 'item-title';
    nameDiv.textContent = 'Loading Framework';
    headerDiv.appendChild(nameDiv);

    // Create skeleton subtitle
    const subtitleDiv = document.createElement('div');
    subtitleDiv.className = 'item-subtitle';
    subtitleDiv.textContent = 'Loading description...';
    headerDiv.appendChild(subtitleDiv);

    // Create skeleton status chip
    const statusDiv = document.createElement('div');
    statusDiv.className = 'item-status';

    const statusIconDiv = document.createElement('div');
    statusIconDiv.className = 'status-icon';
    statusDiv.appendChild(statusIconDiv);

    const statusTextDiv = document.createElement('div');
    statusTextDiv.className = 'status-text';
    statusTextDiv.textContent = 'Loading';
    statusDiv.appendChild(statusTextDiv);

    // Assemble the structure
    contentDiv.appendChild(headerDiv);
    mainDiv.appendChild(avatarDiv);
    mainDiv.appendChild(contentDiv);
    anchor.appendChild(mainDiv);
    anchor.appendChild(statusDiv);
    li.appendChild(anchor);

    return li;
}
