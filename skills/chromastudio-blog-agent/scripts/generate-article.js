        // ✅ Save article as .md file
        const outputDir = path.join(__dirname, '../output');
        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

        const filename = `${keyword.toLowerCase().replace(/\s+/g, '-')}-${blogType}.md`;
        const outputPath = path.join(outputDir, filename);

        // Build full MD with frontmatter
        const frontmatter = `---\ntitle: "${result.metadata.title}"\ndescription: "${result.metadata.description}"\nkeywords: ${JSON.stringify(result.metadata.keywords)}\ncategory: "${result.metadata.category}"\nreadingTime: "${result.metadata.readingTime}"\npublishDate: "${result.metadata.publishDate}"\nauthor: "${result.metadata.author}"\n---\n\n`;

        fs.writeFileSync(outputPath, frontmatter + result.content, 'utf8');
        console.log(`\n✅ Article saved to: ${outputPath}`);