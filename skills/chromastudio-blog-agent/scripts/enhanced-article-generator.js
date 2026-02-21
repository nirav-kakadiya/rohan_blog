#!/usr/bin/env node

/**
 * Enhanced ChromaStudio Blog Article Generator
 * Now includes sitemap fetching and intelligent internal linking
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

class EnhancedChromaStudioBlogGenerator {
    constructor() {
        this.configPath = path.join(__dirname, '../config');
        this.templatesPath = path.join(__dirname, '../templates');
        this.assetsPath = path.join(__dirname, '../assets');
        
        // Load configuration files
        this.toneAnalysis = this.loadConfig('tone-analysis.json');
        this.contentFramework = this.loadConfig('content-framework.json');
        this.uiSpecs = this.loadConfig('ui-specifications.json');
        
        // ChromaStudio sitemap cache
        this.sitemapCache = null;
        this.sitemapCacheTime = 0;
        this.sitemapCacheDuration = 3600000; // 1 hour
    }

    loadConfig(filename) {
        try {
            const filePath = path.join(this.configPath, filename);
            return JSON.parse(fs.readFileSync(filePath, 'utf8'));
        } catch (error) {
            console.error(`Error loading ${filename}:`, error.message);
            return {};
        }
    }

    async fetchChromaStudioSitemap() {
        // Check cache first
        const now = Date.now();
        if (this.sitemapCache && (now - this.sitemapCacheTime) < this.sitemapCacheDuration) {
            return this.sitemapCache;
        }

        console.log('Fetching ChromaStudio sitemap...');
        
        try {
            // Fetch sitemap XML
            const sitemapXml = await this.fetchUrl('https://www.chromastudio.ai/sitemap.xml');
            
            // Parse URLs from sitemap
            const urlPattern = /<loc>(.*?)<\/loc>/g;
            const urls = [];
            let match;
            
            while ((match = urlPattern.exec(sitemapXml)) !== null) {
                const url = match[1];
                const path = url.replace('https://www.chromastudio.ai', '');
                
                // Extract tool/page info
                const pathParts = path.split('/').filter(p => p);
                if (pathParts.length > 0) {
                    urls.push({
                        fullUrl: url,
                        path: path,
                        segments: pathParts,
                        isToolPage: this.isToolPage(pathParts),
                        category: this.categorizeUrl(pathParts),
                        anchorText: this.generateAnchorText(pathParts)
                    });
                }
            }
            
            // Cache the results
            this.sitemapCache = urls;
            this.sitemapCacheTime = now;
            
            console.log(`Cached ${urls.length} ChromaStudio URLs`);
            return urls;
            
        } catch (error) {
            console.warn('Could not fetch sitemap, using fallback URLs:', error.message);
            return this.getFallbackUrls();
        }
    }

    fetchUrl(url) {
        return new Promise((resolve, reject) => {
            const client = url.startsWith('https://') ? https : http;
            
            client.get(url, (res) => {
                if (res.statusCode !== 200) {
                    reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
                    return;
                }
                
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => resolve(data));
            }).on('error', reject);
        });
    }

    isToolPage(pathParts) {
        const toolIndicators = [
            'text-to-video', 'image-to-video', 'text-to-image', 'video-style-transfer',
            'motion-control', 'video-extender', 'video-upscaler', 'background-remover',
            'image-enhancer', 'image-effects', 'watermark-remover', 'talking-avatar',
            'video-effects', 'image-upscaler'
        ];
        
        return pathParts.some(part => 
            toolIndicators.some(indicator => part.includes(indicator))
        );
    }

    categorizeUrl(pathParts) {
        if (pathParts.includes('text-to-video') || pathParts.includes('video')) return 'video-generation';
        if (pathParts.includes('text-to-image') || pathParts.includes('image')) return 'image-generation';
        if (pathParts.includes('upscale') || pathParts.includes('enhance')) return 'enhancement';
        if (pathParts.includes('background') || pathParts.includes('remove')) return 'editing';
        if (pathParts.includes('effects') || pathParts.includes('style')) return 'effects';
        if (pathParts.includes('motion') || pathParts.includes('control')) return 'motion';
        return 'general';
    }

    generateAnchorText(pathParts) {
        // Convert URL path to natural anchor text
        const lastSegment = pathParts[pathParts.length - 1];
        
        return lastSegment
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ')
            .replace(/ai/gi, 'AI')
            .replace(/api/gi, 'API')
            .replace(/4k/gi, '4K')
            .replace(/8k/gi, '8K');
    }

    getFallbackUrls() {
        // Fallback URLs based on common ChromaStudio tools
        return [
            { path: '/text-to-video', anchorText: 'Text to Video AI', category: 'video-generation', isToolPage: true },
            { path: '/image-to-video-ai', anchorText: 'Image to Video AI', category: 'video-generation', isToolPage: true },
            { path: '/text-to-image-ai', anchorText: 'Text to Image AI', category: 'image-generation', isToolPage: true },
            { path: '/ai-video-upscaler', anchorText: 'AI Video Upscaler', category: 'enhancement', isToolPage: true },
            { path: '/ai-image-upscaler', anchorText: 'AI Image Upscaler', category: 'enhancement', isToolPage: true },
            { path: '/ai-video-style-transfer', anchorText: 'Video Style Transfer', category: 'effects', isToolPage: true },
            { path: '/motion-control', anchorText: 'Motion Control', category: 'motion', isToolPage: true },
            { path: '/video-extender', anchorText: 'Video Extender', category: 'video-generation', isToolPage: true },
            { path: '/ai-image-background-remover', anchorText: 'Background Remover', category: 'editing', isToolPage: true },
            { path: '/ai-talking-avatar-generator', anchorText: 'AI Talking Avatar Generator', category: 'video-generation', isToolPage: true },
            { path: '/video-effects', anchorText: 'Video Effects', category: 'effects', isToolPage: true },
            { path: '/image-effects', anchorText: 'Image Effects', category: 'effects', isToolPage: true },
            { path: '/watermark-remover', anchorText: 'Watermark Remover', category: 'editing', isToolPage: true },
            { path: '/ai-image-enhancer', anchorText: 'AI Image Enhancer', category: 'enhancement', isToolPage: true }
        ];
    }

    async generateArticle(options) {
        const {
            blogType,
            topic, 
            keyword,
            targetAudience = 'creators',
            contentLength = 'medium',
            ctaFocus = 'trial'
        } = options;

        console.log(`Generating ${blogType} article about "${topic}" with keyword "${keyword}"`);

        // Validate blog type
        const validTypes = this.contentFramework.blog_types.categories.map(cat => 
            cat.name.toLowerCase().replace(/\s+/g, '-')
        );
        
        if (!validTypes.includes(blogType)) {
            throw new Error(`Invalid blog type. Must be one of: ${validTypes.join(', ')}`);
        }

        // Fetch ChromaStudio sitemap for internal linking
        const sitemapUrls = await this.fetchChromaStudioSitemap();

        // Load appropriate template
        const template = this.loadTemplate(blogType);
        if (!template) {
            throw new Error(`Template not found for blog type: ${blogType}`);
        }

        // Generate article with enhanced internal linking
        const article = await this.processTemplate(template, {
            topic,
            keyword, 
            targetAudience,
            contentLength,
            ctaFocus,
            blogType,
            sitemapUrls
        });

        return {
            content: article,
            metadata: this.generateMetadata(topic, keyword, blogType),
            suggestions: this.generateSuggestions(topic, keyword, blogType),
            internalLinks: this.getUsedInternalLinks(),
            seoAnalysis: this.analyzeSEO(article, keyword)
        };
    }

    loadTemplate(blogType) {
        try {
            const templatePath = path.join(this.templatesPath, `${blogType}-template.md`);
            return fs.readFileSync(templatePath, 'utf8');
        } catch (error) {
            console.error(`Template not found for ${blogType}:`, error.message);
            return null;
        }
    }

    async processTemplate(template, options) {
        let processed = template;
        
        // Replace common placeholders
        const replacements = {
            '[TOPIC]': options.topic,
            '[KEYWORD]': options.keyword,
            '[BLOG_TYPE]': options.blogType.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()),
            '[TARGET_AUDIENCE]': options.targetAudience,
            '[DATE]': new Date().toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            })
        };

        for (const [placeholder, value] of Object.entries(replacements)) {
            processed = processed.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
        }

        // Apply brand voice patterns
        processed = this.applyBrandVoice(processed, options);
        
        // Add intelligent internal links
        processed = await this.addInternalLinks(processed, options);
        
        // Add SEO enhancements
        processed = this.enhanceSEO(processed, options.keyword);
        
        return processed;
    }

    async addInternalLinks(content, options) {
        const { topic, keyword, blogType, sitemapUrls } = options;
        this.usedInternalLinks = [];
        
        // Find relevant URLs for this topic/keyword
        const relevantUrls = this.findRelevantUrls(sitemapUrls, topic, keyword, blogType);
        
        // Strategic link placement
        let enhanced = content;
        
        // Add primary CTA links (main tool being reviewed/discussed)
        if (blogType === 'review') {
            const primaryTool = this.findPrimaryToolUrl(relevantUrls, keyword);
            if (primaryTool) {
                // Add multiple CTAs for primary tool
                enhanced = this.addPrimaryCTAs(enhanced, primaryTool);
            }
        }
        
        // Add contextual tool links
        enhanced = this.addContextualLinks(enhanced, relevantUrls, topic);
        
        // Add supporting tool links
        enhanced = this.addSupportingLinks(enhanced, relevantUrls, blogType);
        
        return enhanced;
    }

    findRelevantUrls(urls, topic, keyword, blogType) {
        if (!urls || !Array.isArray(urls)) return [];
        
        const topicLower = topic.toLowerCase();
        const keywordLower = keyword.toLowerCase();
        
        return urls.filter(url => {
            const pathLower = url.path.toLowerCase();
            const anchorLower = url.anchorText.toLowerCase();
            
            // Check for direct keyword matches
            if (pathLower.includes(keywordLower) || anchorLower.includes(keywordLower)) {
                return true;
            }
            
            // Check for topic relevance
            if (pathLower.includes(topicLower) || anchorLower.includes(topicLower)) {
                return true;
            }
            
            // Check for related terms based on blog type
            const relatedTerms = this.getRelatedTerms(blogType, topic);
            return relatedTerms.some(term => 
                pathLower.includes(term) || anchorLower.includes(term)
            );
        }).slice(0, 15); // Limit to top 15 relevant URLs
    }

    getRelatedTerms(blogType, topic) {
        const terms = [];
        const topicLower = topic.toLowerCase();
        
        // Add terms based on topic content
        if (topicLower.includes('video')) {
            terms.push('video', 'motion', 'cinema', 'effects');
        }
        if (topicLower.includes('image')) {
            terms.push('image', 'photo', 'picture', 'visual');
        }
        if (topicLower.includes('ai') || topicLower.includes('artificial')) {
            terms.push('ai', 'artificial', 'generate', 'create');
        }
        
        // Add blog type specific terms
        switch (blogType) {
            case 'review':
                terms.push('tool', 'generator', 'creator', 'studio');
                break;
            case 'guide':
                terms.push('tutorial', 'how-to', 'create', 'make');
                break;
            case 'comparison':
                terms.push('vs', 'compare', 'alternative', 'best');
                break;
        }
        
        return terms;
    }

    findPrimaryToolUrl(urls, keyword) {
        // Try to find the most specific URL for the primary tool
        const keywordLower = keyword.toLowerCase();
        
        // Look for exact matches first
        for (const url of urls) {
            if (url.path.toLowerCase().includes(keywordLower.replace(/\s+/g, '-'))) {
                return url;
            }
        }
        
        // Look for partial matches
        const keywordWords = keywordLower.split(' ');
        for (const url of urls) {
            const matches = keywordWords.filter(word => 
                url.path.toLowerCase().includes(word) || 
                url.anchorText.toLowerCase().includes(word)
            );
            
            if (matches.length >= 2) {
                return url;
            }
        }
        
        return null;
    }

    addPrimaryCTAs(content, primaryTool) {
        this.usedInternalLinks.push({
            url: primaryTool.path,
            anchorText: primaryTool.anchorText,
            type: 'primary-cta',
            count: 0
        });
        
        // Replace generic CTAs with specific tool links
        const ctaReplacements = [
            {
                pattern: /\[Try [^]]*?\]/g,
                replacement: `[Try ${primaryTool.anchorText}](${primaryTool.path})`
            },
            {
                pattern: /\[Get Started[^]]*?\]/g,
                replacement: `[Try ${primaryTool.anchorText} Now](${primaryTool.path})`
            },
            {
                pattern: /\[Start Creating[^]]*?\]/g,
                replacement: `[Start with ${primaryTool.anchorText}](${primaryTool.path})`
            }
        ];
        
        let enhanced = content;
        ctaReplacements.forEach(({pattern, replacement}) => {
            enhanced = enhanced.replace(pattern, replacement);
            this.usedInternalLinks[this.usedInternalLinks.length - 1].count++;
        });
        
        return enhanced;
    }

    addContextualLinks(content, urls, topic) {
        let enhanced = content;
        
        // Define contextual link opportunities
        const linkOpportunities = [
            { pattern: /text[- ]?to[- ]?video/gi, category: 'video-generation' },
            { pattern: /image[- ]?to[- ]?video/gi, category: 'video-generation' },
            { pattern: /text[- ]?to[- ]?image/gi, category: 'image-generation' },
            { pattern: /video[- ]?upscal/gi, category: 'enhancement' },
            { pattern: /image[- ]?upscal/gi, category: 'enhancement' },
            { pattern: /background[- ]?remov/gi, category: 'editing' },
            { pattern: /video[- ]?effects/gi, category: 'effects' },
            { pattern: /image[- ]?effects/gi, category: 'effects' },
            { pattern: /motion[- ]?control/gi, category: 'motion' },
            { pattern: /style[- ]?transfer/gi, category: 'effects' }
        ];
        
        linkOpportunities.forEach(({ pattern, category }) => {
            const relevantUrl = urls.find(url => url.category === category && url.isToolPage);
            
            if (relevantUrl) {
                const linkText = `[${relevantUrl.anchorText}](${relevantUrl.path})`;
                enhanced = enhanced.replace(pattern, (match) => {
                    // Avoid double-linking
                    if (enhanced.includes(`[${match}]`)) return match;
                    
                    this.usedInternalLinks.push({
                        url: relevantUrl.path,
                        anchorText: relevantUrl.anchorText,
                        type: 'contextual',
                        originalText: match
                    });
                    
                    return linkText;
                });
            }
        });
        
        return enhanced;
    }

    addSupportingLinks(content, urls, blogType) {
        let enhanced = content;
        
        // Add supporting tool links in specific sections
        const supportingSections = {
            'review': ['## Key Features', '## How to Use'],
            'guide': ['## Step', '## Pro Tips'],
            'comparison': ['## Features', '## Performance']
        };
        
        const sectionsToEnhance = supportingSections[blogType] || [];
        
        sectionsToEnhance.forEach(sectionPattern => {
            const sectionRegex = new RegExp(`(${sectionPattern}[^#]*?)$`, 'gm');
            enhanced = enhanced.replace(sectionRegex, (match) => {
                return this.addLinksToSection(match, urls.slice(0, 5));
            });
        });
        
        return enhanced;
    }

    addLinksToSection(sectionText, urls) {
        let enhanced = sectionText;
        
        urls.forEach((url, index) => {
            if (index < 3) { // Limit to 3 links per section
                // Add natural link placement
                const linkText = `Try [${url.anchorText}](${url.path})`;
                
                if (!enhanced.includes(linkText) && !enhanced.includes(url.path)) {
                    // Add to end of section with natural language
                    enhanced += `\n\n**🎯 Related Tool:** ${linkText} for enhanced creative workflows.`;
                    
                    this.usedInternalLinks.push({
                        url: url.path,
                        anchorText: url.anchorText,
                        type: 'supporting',
                        section: 'auto-added'
                    });
                }
            }
        });
        
        return enhanced;
    }

    enhanceSEO(content, keyword) {
        let enhanced = content;
        
        // Ensure keyword appears in first 100 words
        const firstParagraph = enhanced.match(/^[^#]*?(?=\n##|\n---)/s);
        if (firstParagraph && !firstParagraph[0].toLowerCase().includes(keyword.toLowerCase())) {
            enhanced = enhanced.replace(
                firstParagraph[0],
                firstParagraph[0] + ` ${keyword} delivers exceptional results for creative professionals.`
            );
        }
        
        // Add schema markup comments
        enhanced += `\n\n<!-- SEO META TAGS -->\n<!-- 
Primary Keyword: ${keyword}
Schema Type: Article, FAQPage  
Internal Links: ${this.usedInternalLinks?.length || 0} ChromaStudio pages
-->\n`;
        
        return enhanced;
    }

    applyBrandVoice(content, options) {
        const brandVoice = this.toneAnalysis.chromastudio_brand_voice;
        
        // Apply voice characteristics based on content type
        let enhanced = content;
        
        // Apply blog type specific enhancements
        switch (options.blogType) {
            case 'review':
                enhanced = this.enhanceReviewVoice(enhanced, options);
                break;
            case 'guide':
                enhanced = this.enhanceGuideVoice(enhanced, options);
                break;
            case 'comparison':
                enhanced = this.enhanceComparisonVoice(enhanced, options);
                break;
            default:
                enhanced = this.enhanceGeneralVoice(enhanced, options);
        }

        return enhanced;
    }

    enhanceReviewVoice(content, options) {
        return content
            .replace(/\[COMPELLING BENEFIT\/OUTCOME\]/g, 
                `${options.topic}'s Game-Changing Features That Transform Creative Workflows`)
            .replace(/\[TOOL NAME\]/g, options.topic)
            .replace(/\[KEY ADVANTAGE\]/g, 'revolutionary AI capabilities');
    }

    enhanceGuideVoice(content, options) {
        return content
            .replace(/\[ACHIEVE SPECIFIC OUTCOME\]/g,
                `Create Professional ${options.topic} Content`)
            .replace(/\[TOOL\/METHOD\]/g, options.keyword);
    }

    enhanceComparisonVoice(content, options) {
        return content
            .replace(/\[TOOL A\]/g, options.topic.split(' vs ')[0] || options.topic)
            .replace(/\[TOOL B\]/g, options.topic.split(' vs ')[1] || 'Alternatives')
            .replace(/\[CATEGORY\]/g, 'AI Creative Tools');
    }

    enhanceGeneralVoice(content, options) {
        // General voice improvements
        return content
            .replace(/\[TOPIC\]/g, options.topic)
            .replace(/\[KEYWORD\]/g, options.keyword);
    }

    generateMetadata(topic, keyword, blogType) {
        const currentYear = new Date().getFullYear();
        
        return {
            title: `${keyword} Review (${currentYear}): Features, Pricing & Complete Guide`,
            description: `Comprehensive ${keyword} review with hands-on testing, pricing analysis, and comparison with alternatives. Try ${keyword} free on ChromaStudio.`,
            keywords: [keyword, `${keyword} review`, `${keyword} pricing`, `${keyword} features`, `best ${blogType} ${currentYear}`, 'ChromaStudio'],
            category: blogType,
            readingTime: this.estimateReadingTime(blogType),
            publishDate: new Date().toISOString(),
            author: 'ChromaStudio Team',
            canonicalUrl: `/blog/${keyword.toLowerCase().replace(/\s+/g, '-')}-review`,
            ogImage: `/images/blog/${keyword.toLowerCase().replace(/\s+/g, '-')}-review-og.jpg`
        };
    }

    estimateReadingTime(blogType) {
        const readingTimes = {
            'review': '10-15',
            'guide': '15-20', 
            'comparison': '12-18',
            'prompt': '8-12',
            'troubleshooting': '8-12'
        };
        
        return `${readingTimes[blogType] || '10-15'} min read`;
    }

    generateSuggestions(topic, keyword, blogType) {
        return {
            relatedTopics: this.getRelatedTopics(topic, blogType),
            internalLinks: this.suggestInternalLinks(topic, keyword),
            ctaPlacement: this.suggestCTAPlacement(blogType),
            visualContent: this.suggestVisualContent(topic, blogType),
            nextArticles: this.suggestFollowUpArticles(topic, keyword, blogType)
        };
    }

    suggestFollowUpArticles(topic, keyword, blogType) {
        const articles = [];
        
        if (blogType === 'review') {
            articles.push(`${keyword} vs Alternatives: Which Tool Wins?`);
            articles.push(`How to Use ${keyword}: Complete Tutorial Guide`);
            articles.push(`Best ${keyword.split(' ')[0]} Tools in ${new Date().getFullYear()}`);
        }
        
        return articles;
    }

    getUsedInternalLinks() {
        return this.usedInternalLinks || [];
    }

    analyzeSEO(content, keyword) {
        const analysis = {
            keywordInTitle: content.includes(keyword),
            keywordInFirst100: content.substring(0, 500).toLowerCase().includes(keyword.toLowerCase()),
            keywordInHeadings: (content.match(new RegExp(`##.*${keyword}`, 'gi')) || []).length,
            internalLinkCount: this.getUsedInternalLinks().length,
            faqCount: (content.match(/###[^#]*\?/g) || []).length,
            readabilityScore: this.calculateReadabilityScore(content),
            recommendations: []
        };
        
        // Generate SEO recommendations
        if (!analysis.keywordInTitle) {
            analysis.recommendations.push('Add target keyword to H1 title');
        }
        if (analysis.internalLinkCount < 5) {
            analysis.recommendations.push('Add more internal links to ChromaStudio tools');
        }
        if (analysis.faqCount < 5) {
            analysis.recommendations.push('Expand FAQ section for featured snippets');
        }
        
        return analysis;
    }

    calculateReadabilityScore(content) {
        // Simple readability calculation
        const sentences = content.split(/[.!?]+/).length;
        const words = content.split(/\s+/).length;
        const avgWordsPerSentence = words / sentences;
        
        // Score based on average sentence length
        if (avgWordsPerSentence < 15) return 'Excellent';
        if (avgWordsPerSentence < 20) return 'Good';
        if (avgWordsPerSentence < 25) return 'Fair';
        return 'Needs Improvement';
    }
}

// CLI Interface
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.length < 3) {
        console.log(`
Enhanced ChromaStudio Blog Generator

Usage: node enhanced-article-generator.js <blog-type> <topic> <keyword> [options]

Blog Types: review, guide, comparison, prompt, use-case, api, trend, troubleshooting, tool

Example: node enhanced-article-generator.js review "Kling AI 3.0" "AI video generator"

Features:
• Automatic sitemap fetching from ChromaStudio
• Intelligent internal linking with relevant anchor text
• SEO optimization and analysis
• Brand voice consistency
• Production-ready output

Options:
  --audience <audience>    Target audience (creators, developers, businesses)
  --length <length>        Content length (short, medium, long)  
  --cta <focus>           CTA focus (signup, trial, specific-tool)
        `);
        process.exit(1);
    }

    const [blogType, topic, keyword] = args;
    const generator = new EnhancedChromaStudioBlogGenerator();
    
    (async () => {
        try {
            console.log('🚀 Starting enhanced article generation...\n');
            
            const result = await generator.generateArticle({
                blogType,
                topic,
                keyword,
                targetAudience: 'creators',
                contentLength: 'medium',
                ctaFocus: 'trial'
            });
            
            console.log('=== GENERATED ARTICLE ===\n');
            console.log(result.content);
            
            console.log('\n=== METADATA ===\n');
            console.log(JSON.stringify(result.metadata, null, 2));
            
            console.log('\n=== INTERNAL LINKS ADDED ===\n');
            result.internalLinks.forEach(link => {
                console.log(`• ${link.anchorText} → ${link.url} (${link.type})`);
            });
            
            console.log('\n=== SEO ANALYSIS ===\n');
            console.log(JSON.stringify(result.seoAnalysis, null, 2));
            
            console.log('\n✅ Article generation complete!');
            // ✅ Save article as .md file
            const outputDir = path.join(__dirname, '../output');
            if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

            const filename = `${keyword.toLowerCase().replace(/\s+/g, '-')}-${blogType}.md`;
            const outputPath = path.join(outputDir, filename);

            // Build full MD with frontmatter
            const frontmatter = `---
    title: "${result.metadata.title}"
    description: "${result.metadata.description}"
    keywords: ${JSON.stringify(result.metadata.keywords)}
    category: "${result.metadata.category}"
    readingTime: "${result.metadata.readingTime}"
    publishDate: "${result.metadata.publishDate}"
    author: "${result.metadata.author}"
    ---\n\n`;

            fs.writeFileSync(outputPath, frontmatter + result.content, 'utf8');
            console.log(`\n✅ Article saved to: ${outputPath}`);
        
            
        } catch (error) {
            console.error('❌ Error generating article:', error.message);
            process.exit(1);
        }
    })();
}

module.exports = EnhancedChromaStudioBlogGenerator;
