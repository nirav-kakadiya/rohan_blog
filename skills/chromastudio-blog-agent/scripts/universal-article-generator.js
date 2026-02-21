#!/usr/bin/env node

/**
 * Universal Blog Content Agent
 * Creates SEO-optimized blog articles with strategic internal linking for ANY platform
 * Usage: node universal-article-generator.js <blog-type> <topic> <keyword> <platform-url>
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { URL } = require('url');

class UniversalBlogContentAgent {
    constructor() {
        this.configPath = path.join(__dirname, '../config');
        this.templatesPath = path.join(__dirname, '../templates');
        this.assetsPath = path.join(__dirname, '../assets');
        
        // Load base configurations
        this.toneAnalysis = this.loadConfig('tone-analysis.json');
        this.contentFramework = this.loadConfig('content-framework.json');
        this.uiSpecs = this.loadConfig('ui-specifications.json');
        
        // Platform-specific cache
        this.platformCache = new Map();
        this.sitemapCacheDuration = 3600000; // 1 hour
        
        // Universal tool categories for any platform
        this.universalCategories = {
            'text-to-image': ['text-to-image', 'ai-image', 'image-generator', 'create-image'],
            'text-to-video': ['text-to-video', 'ai-video', 'video-generator', 'create-video'],
            'image-to-video': ['image-to-video', 'animate-image', 'photo-to-video'],
            'video-enhancement': ['video-upscaler', 'enhance-video', 'improve-video', 'video-quality'],
            'image-enhancement': ['image-upscaler', 'enhance-image', 'improve-image', 'photo-quality'],
            'background-removal': ['remove-background', 'background-remover', 'cutout'],
            'style-transfer': ['style-transfer', 'artistic-style', 'art-filter'],
            'face-generation': ['face-generator', 'portrait-ai', 'headshot'],
            'video-editing': ['video-editor', 'edit-video', 'video-tools'],
            'image-editing': ['image-editor', 'edit-image', 'photo-editor']
        };
    }

    loadConfig(filename) {
        try {
            const filePath = path.join(this.configPath, filename);
            return JSON.parse(fs.readFileSync(filePath, 'utf8'));
        } catch (error) {
            console.warn(`Config ${filename} not found, using defaults`);
            return {};
        }
    }

    async generateUniversalArticle(options) {
        const {
            blogType,
            topic,
            keyword,
            platformUrl,
            targetAudience = 'creators',
            contentLength = 'medium',
            ctaFocus = 'trial'
        } = options;

        console.log(`🚀 Generating ${blogType} article about "${topic}" for platform: ${platformUrl}`);

        // Extract platform information
        const platform = await this.analyzePlatform(platformUrl);
        
        // Fetch platform sitemap and tools
        const sitemapData = await this.fetchPlatformSitemap(platform);
        
        // Load and process template
        const template = this.loadTemplate(blogType);
        if (!template) {
            throw new Error(`Template not found for blog type: ${blogType}`);
        }

        // Generate article with platform-specific content
        const article = await this.processUniversalTemplate(template, {
            topic,
            keyword,
            targetAudience,
            contentLength,
            ctaFocus,
            blogType,
            platform,
            sitemapData
        });

        return {
            content: article,
            metadata: this.generateUniversalMetadata(topic, keyword, blogType, platform),
            platform: platform,
            internalLinks: this.getUsedInternalLinks(),
            seoAnalysis: this.analyzeSEO(article, keyword, platform),
            suggestions: this.generateUniversalSuggestions(topic, keyword, blogType, platform)
        };
    }

    async analyzePlatform(platformUrl) {
        const url = new URL(platformUrl);
        const domain = url.hostname.replace('www.', '');
        
        // Extract brand name from domain
        const brandName = this.extractBrandName(domain);
        
        // Create platform object
        const platform = {
            name: brandName,
            domain: domain,
            fullUrl: platformUrl,
            baseUrl: `${url.protocol}//${url.hostname}`,
            brandColors: await this.extractBrandColors(platformUrl),
            category: this.detectPlatformCategory(domain)
        };

        console.log(`🎯 Detected platform: ${platform.name} (${platform.category})`);
        return platform;
    }

    extractBrandName(domain) {
        // Extract brand name from domain
        const domainParts = domain.split('.');
        const mainPart = domainParts[0];
        
        // Handle common patterns
        if (mainPart.includes('-')) {
            return mainPart.split('-')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
        }
        
        // Capitalize first letter
        return mainPart.charAt(0).toUpperCase() + mainPart.slice(1);
    }

    detectPlatformCategory(domain) {
        const categoryKeywords = {
            'ai-creative': ['studio', 'creative', 'art', 'design'],
            'ai-tools': ['ai', 'tool', 'generator', 'maker'],
            'content': ['content', 'media', 'create'],
            'tech': ['tech', 'software', 'app'],
            'general': []
        };

        for (const [category, keywords] of Object.entries(categoryKeywords)) {
            if (keywords.some(keyword => domain.includes(keyword))) {
                return category;
            }
        }
        return 'general';
    }

    async extractBrandColors(platformUrl) {
        // In a real implementation, this could scrape the site's CSS
        // For now, return defaults based on common patterns
        const defaults = {
            primary: '#3B82F6',
            secondary: '#10B981', 
            accent: '#F59E0B'
        };
        
        return defaults;
    }

    async fetchPlatformSitemap(platform) {
        const cacheKey = platform.domain;
        const now = Date.now();
        
        // Check cache first
        if (this.platformCache.has(cacheKey)) {
            const cached = this.platformCache.get(cacheKey);
            if ((now - cached.timestamp) < this.sitemapCacheDuration) {
                console.log(`📋 Using cached sitemap for ${platform.name}`);
                return cached.data;
            }
        }

        console.log(`🌐 Fetching sitemap from ${platform.baseUrl}...`);
        
        try {
            // Try common sitemap locations
            const sitemapUrls = [
                `${platform.baseUrl}/sitemap.xml`,
                `${platform.baseUrl}/sitemap_index.xml`,
                `${platform.baseUrl}/robots.txt` // fallback to parse sitemap location
            ];

            let sitemapData = null;
            
            for (const sitemapUrl of sitemapUrls) {
                try {
                    const data = await this.fetchSitemapXml(sitemapUrl);
                    if (data) {
                        sitemapData = data;
                        break;
                    }
                } catch (error) {
                    console.warn(`Failed to fetch ${sitemapUrl}: ${error.message}`);
                }
            }

            if (!sitemapData) {
                console.log(`🔄 No sitemap found, using navigation crawl for ${platform.name}`);
                sitemapData = await this.crawlPlatformNavigation(platform);
            }

            // Process and categorize URLs
            const processedData = this.processPlatformUrls(sitemapData, platform);
            
            // Cache the results
            this.platformCache.set(cacheKey, {
                data: processedData,
                timestamp: now
            });

            console.log(`✅ Found ${processedData.length} URLs for ${platform.name}`);
            return processedData;
            
        } catch (error) {
            console.warn(`⚠️ Error fetching sitemap for ${platform.name}:`, error.message);
            return this.generateFallbackUrls(platform);
        }
    }

    async fetchSitemapXml(url) {
        return new Promise((resolve, reject) => {
            const client = url.startsWith('https://') ? https : http;
            
            const request = client.get(url, {
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; BlogContentAgent/1.0)'
                }
            }, (res) => {
                if (res.statusCode !== 200) {
                    reject(new Error(`HTTP ${res.statusCode}`));
                    return;
                }
                
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    if (data.includes('<urlset') || data.includes('<sitemapindex')) {
                        resolve(data);
                    } else {
                        reject(new Error('Invalid sitemap format'));
                    }
                });
            });
            
            request.on('error', reject);
            request.on('timeout', () => {
                request.destroy();
                reject(new Error('Request timeout'));
            });
        });
    }

    async crawlPlatformNavigation(platform) {
        // Simplified navigation crawl - in production, this would be more sophisticated
        console.log(`🕷️ Crawling navigation for ${platform.name}...`);
        
        try {
            const homePage = await this.fetchUrl(`${platform.baseUrl}/`);
            const links = this.extractLinksFromHtml(homePage, platform.baseUrl);
            
            return links.map(link => `<loc>${link}</loc>`).join('\n');
        } catch (error) {
            console.warn(`Navigation crawl failed: ${error.message}`);
            return '';
        }
    }

    fetchUrl(url) {
        return new Promise((resolve, reject) => {
            const client = url.startsWith('https://') ? https : http;
            
            const request = client.get(url, {
                timeout: 5000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; BlogContentAgent/1.0)'
                }
            }, (res) => {
                if (res.statusCode !== 200) {
                    reject(new Error(`HTTP ${res.statusCode}`));
                    return;
                }
                
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => resolve(data));
            });
            
            request.on('error', reject);
            request.on('timeout', () => {
                request.destroy();
                reject(new Error('Request timeout'));
            });
        });
    }

    extractLinksFromHtml(html, baseUrl) {
        // Simple link extraction - in production, would use proper HTML parser
        const linkPattern = /href=['"](\/[^'"]*)['"]/g;
        const links = [];
        let match;
        
        while ((match = linkPattern.exec(html)) !== null) {
            const path = match[1];
            if (this.isToolPath(path)) {
                links.push(`${baseUrl}${path}`);
            }
        }
        
        return links.slice(0, 20); // Limit to prevent overwhelming
    }

    isToolPath(path) {
        const toolIndicators = [
            'tool', 'generator', 'create', 'make', 'ai-', 'generate',
            'image', 'video', 'text', 'photo', 'art', 'design'
        ];
        
        const pathLower = path.toLowerCase();
        return toolIndicators.some(indicator => pathLower.includes(indicator)) &&
               !pathLower.includes('blog') &&
               !pathLower.includes('about') &&
               !pathLower.includes('contact') &&
               !pathLower.includes('privacy');
    }

    processPlatformUrls(sitemapXml, platform) {
        const urlPattern = /<loc>(.*?)<\/loc>/g;
        const urls = [];
        let match;
        
        while ((match = urlPattern.exec(sitemapXml)) !== null) {
            const fullUrl = match[1];
            const path = fullUrl.replace(platform.baseUrl, '');
            
            if (this.isRelevantUrl(path)) {
                const urlInfo = {
                    fullUrl: fullUrl,
                    path: path,
                    segments: path.split('/').filter(p => p),
                    category: this.categorizeUrl(path),
                    anchorText: this.generateAnchorText(path, platform),
                    isToolPage: this.isToolPath(path),
                    priority: this.calculateUrlPriority(path)
                };
                
                urls.push(urlInfo);
            }
        }
        
        // Sort by priority and relevance
        return urls
            .sort((a, b) => b.priority - a.priority)
            .slice(0, 30); // Limit to top 30 URLs
    }

    isRelevantUrl(path) {
        const excludePatterns = [
            '/blog', '/news', '/about', '/contact', '/privacy', '/terms',
            '/login', '/signup', '/account', '/profile', '/settings',
            '.xml', '.pdf', '.jpg', '.png', '.gif'
        ];
        
        return !excludePatterns.some(pattern => path.includes(pattern)) &&
               path.length > 1 && 
               path.split('/').length <= 4; // Avoid very deep URLs
    }

    categorizeUrl(path) {
        const pathLower = path.toLowerCase();
        
        for (const [category, keywords] of Object.entries(this.universalCategories)) {
            if (keywords.some(keyword => pathLower.includes(keyword))) {
                return category;
            }
        }
        
        // Fallback categorization
        if (pathLower.includes('image') || pathLower.includes('photo')) return 'image-tools';
        if (pathLower.includes('video')) return 'video-tools';
        if (pathLower.includes('text')) return 'text-tools';
        if (pathLower.includes('audio')) return 'audio-tools';
        
        return 'general-tools';
    }

    generateAnchorText(path, platform) {
        // Convert URL path to natural anchor text
        const segments = path.split('/').filter(p => p);
        const lastSegment = segments[segments.length - 1] || segments[segments.length - 2] || '';
        
        const anchorText = lastSegment
            .replace(/-/g, ' ')
            .replace(/_/g, ' ')
            .split(' ')
            .map(word => {
                // Capitalize appropriately
                if (word.toLowerCase() === 'ai') return 'AI';
                if (word.toLowerCase() === 'api') return 'API';
                if (word.match(/^\d+k$/i)) return word.toUpperCase();
                return word.charAt(0).toUpperCase() + word.slice(1);
            })
            .join(' ');
        
        return anchorText || `${platform.name} Tool`;
    }

    calculateUrlPriority(path) {
        let priority = 0;
        
        // Higher priority for likely tool pages
        const highValueKeywords = ['generator', 'create', 'make', 'ai-', 'tool'];
        const mediumValueKeywords = ['editor', 'enhance', 'convert', 'transform'];
        const lowValueKeywords = ['about', 'help', 'support'];
        
        const pathLower = path.toLowerCase();
        
        if (highValueKeywords.some(keyword => pathLower.includes(keyword))) priority += 10;
        if (mediumValueKeywords.some(keyword => pathLower.includes(keyword))) priority += 5;
        if (lowValueKeywords.some(keyword => pathLower.includes(keyword))) priority -= 5;
        
        // Shorter paths often more important
        priority += Math.max(0, 5 - path.split('/').length);
        
        return priority;
    }

    generateFallbackUrls(platform) {
        console.log(`📋 Generating fallback URLs for ${platform.name}`);
        
        const fallbackPaths = [
            '/text-to-image',
            '/image-generator', 
            '/ai-image',
            '/create-image',
            '/text-to-video',
            '/video-generator',
            '/ai-video', 
            '/create-video',
            '/image-to-video',
            '/enhance-image',
            '/upscale-image',
            '/remove-background',
            '/tools',
            '/features',
            '/'
        ];
        
        return fallbackPaths.map(path => ({
            fullUrl: `${platform.baseUrl}${path}`,
            path: path,
            segments: path.split('/').filter(p => p),
            category: this.categorizeUrl(path),
            anchorText: this.generateAnchorText(path, platform),
            isToolPage: this.isToolPath(path),
            priority: this.calculateUrlPriority(path)
        }));
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

    async processUniversalTemplate(template, options) {
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
            }),
            '[PLATFORM_NAME]': options.platform.name,
            '[PLATFORM_URL]': options.platform.baseUrl
        };

        for (const [placeholder, value] of Object.entries(replacements)) {
            const regex = new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
            processed = processed.replace(regex, value);
        }

        // Apply platform-specific brand voice
        processed = this.applyUniversalBrandVoice(processed, options);
        
        // Add strategic internal links for the platform
        processed = await this.addUniversalInternalLinks(processed, options);
        
        // Enhance SEO for the platform
        processed = this.enhanceUniversalSEO(processed, options);
        
        return processed;
    }

    applyUniversalBrandVoice(content, options) {
        const { platform, blogType } = options;
        
        // Replace generic references with platform-specific ones
        let enhanced = content;
        
        // Replace platform references
        enhanced = enhanced.replace(/ChromaStudio/g, platform.name);
        enhanced = enhanced.replace(/chromastudio\.ai/g, platform.domain);
        
        // Update CTAs to be platform-specific
        const platformCTAs = [
            `Try ${platform.name}`,
            `Start with ${platform.name}`,
            `Create on ${platform.name}`,
            `Generate with ${platform.name}`,
            `Use ${platform.name} AI`
        ];
        
        // Replace generic CTAs with platform-specific ones
        enhanced = enhanced.replace(/Try ChromaStudio/g, `Try ${platform.name}`);
        enhanced = enhanced.replace(/Start Creating/g, `Start with ${platform.name}`);
        enhanced = enhanced.replace(/Generate Now/g, `Create on ${platform.name}`);
        
        return enhanced;
    }

    async addUniversalInternalLinks(content, options) {
        const { platform, sitemapData, topic, keyword, blogType } = options;
        
        this.usedInternalLinks = [];
        
        if (!sitemapData || !Array.isArray(sitemapData)) {
            console.warn('No sitemap data available for internal linking');
            return content;
        }
        
        // Find relevant URLs for this content
        const relevantUrls = this.findRelevantUrls(sitemapData, topic, keyword, blogType);
        
        let enhanced = content;
        
        // Add primary platform CTAs
        enhanced = this.addPlatformPrimaryCTAs(enhanced, relevantUrls, platform);
        
        // Add contextual tool links
        enhanced = this.addContextualToolLinks(enhanced, relevantUrls, platform);
        
        // Add supporting platform links  
        enhanced = this.addSupportingPlatformLinks(enhanced, relevantUrls, platform);
        
        return enhanced;
    }

    findRelevantUrls(urls, topic, keyword, blogType) {
        const topicLower = topic.toLowerCase();
        const keywordLower = keyword.toLowerCase();
        
        return urls.filter(url => {
            const pathLower = url.path.toLowerCase();
            const anchorLower = url.anchorText.toLowerCase();
            
            // Direct keyword/topic matches
            if (pathLower.includes(keywordLower) || anchorLower.includes(keywordLower)) {
                return true;
            }
            
            if (pathLower.includes(topicLower) || anchorLower.includes(topicLower)) {
                return true;
            }
            
            // Category relevance
            const relatedTerms = this.getRelatedTerms(blogType, topic);
            return relatedTerms.some(term => 
                pathLower.includes(term) || anchorLower.includes(term)
            );
        }).slice(0, 20);
    }

    getRelatedTerms(blogType, topic) {
        const terms = [];
        const topicLower = topic.toLowerCase();
        
        // Topic-based terms
        if (topicLower.includes('image')) terms.push('image', 'photo', 'picture', 'visual');
        if (topicLower.includes('video')) terms.push('video', 'motion', 'cinema', 'film');
        if (topicLower.includes('ai')) terms.push('ai', 'artificial', 'generate', 'create');
        if (topicLower.includes('text')) terms.push('text', 'writing', 'content');
        
        // Blog type specific terms
        switch (blogType) {
            case 'review':
                terms.push('tool', 'generator', 'creator', 'maker');
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

    addPlatformPrimaryCTAs(content, relevantUrls, platform) {
        // Find the most relevant URL for primary CTAs
        const primaryUrl = relevantUrls.find(url => url.isToolPage && url.priority > 5) || 
                          relevantUrls[0] || 
                          { path: '/', anchorText: platform.name };
        
        // Track usage
        this.usedInternalLinks.push({
            url: primaryUrl.path,
            anchorText: primaryUrl.anchorText,
            type: 'primary-cta',
            count: 0
        });
        
        // Replace common CTA patterns
        const ctaReplacements = [
            {
                pattern: /\[Try [^\]]*\]\([^)]*\)/g,
                replacement: `[Try ${primaryUrl.anchorText}](${primaryUrl.path})`
            },
            {
                pattern: /\[Get Started[^\]]*\]\([^)]*\)/g,
                replacement: `[Get Started with ${platform.name}](${primaryUrl.path})`
            },
            {
                pattern: /\[Start Creating[^\]]*\]\([^)]*\)/g,
                replacement: `[Start Creating with ${platform.name}](${primaryUrl.path})`
            }
        ];
        
        let enhanced = content;
        ctaReplacements.forEach(({pattern, replacement}) => {
            const matches = enhanced.match(pattern);
            if (matches) {
                enhanced = enhanced.replace(pattern, replacement);
                this.usedInternalLinks[this.usedInternalLinks.length - 1].count += matches.length;
            }
        });
        
        return enhanced;
    }

    addContextualToolLinks(content, relevantUrls, platform) {
        let enhanced = content;
        
        // Define contextual linking opportunities for any platform
        const linkOpportunities = [
            { pattern: /(?:text[- ]?to[- ]?image|image generation|create images?)/gi, category: 'text-to-image' },
            { pattern: /(?:text[- ]?to[- ]?video|video generation|create videos?)/gi, category: 'text-to-video' },
            { pattern: /(?:image[- ]?to[- ]?video|animate images?)/gi, category: 'image-to-video' },
            { pattern: /(?:upscal|enhance|improve)(?:.*?)(?:image|photo)/gi, category: 'image-enhancement' },
            { pattern: /(?:upscal|enhance|improve)(?:.*?)video/gi, category: 'video-enhancement' },
            { pattern: /(?:remove|background removal)/gi, category: 'background-removal' },
            { pattern: /(?:style transfer|artistic style)/gi, category: 'style-transfer' }
        ];
        
        linkOpportunities.forEach(({ pattern, category }) => {
            const relevantUrl = relevantUrls.find(url => url.category === category) ||
                              relevantUrls.find(url => url.anchorText.toLowerCase().includes(category.replace('-', ' ')));
            
            if (relevantUrl && !enhanced.includes(`[${relevantUrl.anchorText}](${relevantUrl.path})`)) {
                enhanced = enhanced.replace(pattern, (match) => {
                    // Avoid double-linking
                    if (enhanced.includes(`[${match}]`)) return match;
                    
                    this.usedInternalLinks.push({
                        url: relevantUrl.path,
                        anchorText: relevantUrl.anchorText,
                        type: 'contextual',
                        originalText: match
                    });
                    
                    return `[${relevantUrl.anchorText}](${relevantUrl.path})`;
                });
            }
        });
        
        return enhanced;
    }

    addSupportingPlatformLinks(content, relevantUrls, platform) {
        let enhanced = content;
        
        // Add platform homepage links
        if (!enhanced.includes(`](${platform.baseUrl})`)) {
            const homepageLink = `\n\n**🎯 Explore more:** Discover all [${platform.name}](${platform.baseUrl}) creative tools and features.`;
            enhanced += homepageLink;
            
            this.usedInternalLinks.push({
                url: platform.baseUrl,
                anchorText: platform.name,
                type: 'homepage',
                section: 'footer'
            });
        }
        
        // Add 3-5 additional tool links in conclusion
        const additionalUrls = relevantUrls
            .filter(url => !this.usedInternalLinks.some(used => used.url === url.path))
            .slice(0, 5);
        
        if (additionalUrls.length > 0) {
            const toolLinks = additionalUrls
                .map(url => `[${url.anchorText}](${url.path})`)
                .join(' · ');
            
            enhanced += `\n\n**Related Tools:** ${toolLinks}\n`;
            
            additionalUrls.forEach(url => {
                this.usedInternalLinks.push({
                    url: url.path,
                    anchorText: url.anchorText,
                    type: 'supporting',
                    section: 'footer'
                });
            });
        }
        
        return enhanced;
    }

    enhanceUniversalSEO(content, options) {
        const { keyword, platform } = options;
        let enhanced = content;
        
        // Ensure keyword appears in first 100 words with platform context
        const firstParagraph = enhanced.match(/^[^#]*?(?=\n##|\n---)/s);
        if (firstParagraph && !firstParagraph[0].toLowerCase().includes(keyword.toLowerCase())) {
            enhanced = enhanced.replace(
                firstParagraph[0],
                firstParagraph[0] + ` ${keyword} on ${platform.name} delivers exceptional results for creative professionals.`
            );
        }
        
        // Add platform-specific schema markup
        enhanced += `\n\n<!-- PLATFORM-SPECIFIC SEO -->\n<!-- 
Platform: ${platform.name} (${platform.domain})
Primary Keyword: ${keyword}
Internal Links: ${this.usedInternalLinks?.length || 0} platform-specific URLs
Schema Type: Article, FAQPage, Organization
-->\n`;
        
        return enhanced;
    }

    generateUniversalMetadata(topic, keyword, blogType, platform) {
        const currentYear = new Date().getFullYear();
        
        return {
            title: `${keyword} Review (${currentYear}): Complete ${platform.name} Guide`,
            description: `Comprehensive ${keyword} review and tutorial for ${platform.name}. Features, pricing, and hands-on testing. Try ${keyword} on ${platform.name} today.`,
            keywords: [
                keyword, 
                `${keyword} review`, 
                `${keyword} ${platform.name}`,
                `${platform.name} ${blogType}`,
                `best ${keyword} ${currentYear}`,
                platform.name.toLowerCase()
            ],
            category: blogType,
            readingTime: this.estimateReadingTime(blogType),
            publishDate: new Date().toISOString(),
            author: `${platform.name} Team`,
            platform: platform.name,
            canonicalUrl: `${platform.baseUrl}/blog/${keyword.toLowerCase().replace(/\s+/g, '-')}-review`,
            ogImage: `${platform.baseUrl}/images/blog/${keyword.toLowerCase().replace(/\s+/g, '-')}-review.jpg`
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

    generateUniversalSuggestions(topic, keyword, blogType, platform) {
        return {
            relatedTopics: this.getRelatedTopics(topic, blogType),
            platformIntegration: this.suggestPlatformIntegration(platform),
            ctaOptimization: this.suggestCTAOptimization(platform),
            internalLinking: this.suggestInternalLinking(platform),
            nextArticles: this.suggestFollowUpArticles(topic, keyword, blogType, platform)
        };
    }

    getRelatedTopics(topic, blogType) {
        const articles = [];
        
        if (blogType === 'review') {
            articles.push(`${topic} vs Alternatives: Complete Comparison`);
            articles.push(`How to Use ${topic}: Step-by-Step Guide`);
            articles.push(`Best ${topic.split(' ')[0]} Tools in ${new Date().getFullYear()}`);
        } else if (blogType === 'guide') {
            articles.push(`Advanced ${topic} Techniques`);
            articles.push(`${topic} for Beginners`);
            articles.push(`Professional ${topic} Workflows`);
        }
        
        return articles;
    }

    suggestPlatformIntegration(platform) {
        return [
            `Homepage integration: Link to ${platform.baseUrl}`,
            `Tool discovery: Feature ${platform.name} tool pages`,
            `Brand consistency: Use ${platform.name} terminology`,
            `CTA optimization: Direct users to ${platform.name} signup/trial`
        ];
    }

    suggestCTAOptimization(platform) {
        return [
            `"Try ${platform.name}" instead of generic "Get Started"`,
            `"Create with ${platform.name}" for action-oriented CTAs`,
            `"Explore ${platform.name} Tools" for discovery`,
            `"Start Your ${platform.name} Journey" for onboarding`
        ];
    }

    suggestInternalLinking(platform) {
        return [
            `Link to ${platform.name} tool pages contextually`,
            `Include ${platform.baseUrl} homepage references`,
            `Cross-link related ${platform.name} features`,
            `Reference ${platform.name} pricing and plans`
        ];
    }

    suggestFollowUpArticles(topic, keyword, blogType, platform) {
        return [
            `${keyword} on ${platform.name}: Complete Tutorial`,
            `${platform.name} vs Competitors: Which is Better?`,
            `Best ${platform.name} Features for ${topic}`,
            `${keyword} Pricing: ${platform.name} Cost Analysis`
        ];
    }

    getUsedInternalLinks() {
        return this.usedInternalLinks || [];
    }

    analyzeSEO(content, keyword, platform) {
        const analysis = {
            keywordInTitle: content.includes(keyword),
            keywordInFirst100: content.substring(0, 500).toLowerCase().includes(keyword.toLowerCase()),
            keywordInHeadings: (content.match(new RegExp(`##.*${keyword}`, 'gi')) || []).length,
            platformMentions: (content.match(new RegExp(platform.name, 'g')) || []).length,
            internalLinkCount: this.getUsedInternalLinks().length,
            faqCount: (content.match(/###[^#]*\?/g) || []).length,
            readabilityScore: this.calculateReadabilityScore(content),
            platformOptimization: this.analyzePlatformOptimization(content, platform),
            recommendations: []
        };
        
        // Generate recommendations
        if (!analysis.keywordInTitle) {
            analysis.recommendations.push('Add target keyword to H1 title');
        }
        if (analysis.platformMentions < 5) {
            analysis.recommendations.push(`Increase ${platform.name} brand mentions`);
        }
        if (analysis.internalLinkCount < 10) {
            analysis.recommendations.push(`Add more internal links to ${platform.name} tools`);
        }
        if (analysis.faqCount < 5) {
            analysis.recommendations.push('Expand FAQ section for featured snippets');
        }
        
        return analysis;
    }

    analyzePlatformOptimization(content, platform) {
        return {
            brandConsistency: content.includes(platform.name),
            platformUrls: content.includes(platform.domain),
            platformSpecificCTAs: content.includes(`Try ${platform.name}`) || content.includes(`Start with ${platform.name}`),
            homepageLinks: content.includes(platform.baseUrl)
        };
    }

    calculateReadabilityScore(content) {
        const sentences = content.split(/[.!?]+/).length;
        const words = content.split(/\s+/).length;
        const avgWordsPerSentence = words / sentences;
        
        if (avgWordsPerSentence < 15) return 'Excellent';
        if (avgWordsPerSentence < 20) return 'Good';
        if (avgWordsPerSentence < 25) return 'Fair';
        return 'Needs Improvement';
    }
}

// CLI Interface
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.length < 4) {
        console.log(`
🌍 Universal Blog Content Agent

Generate SEO-optimized blog articles with strategic internal linking for ANY platform!

Usage: node universal-article-generator.js <blog-type> <topic> <keyword> <platform-url>

Examples:
  # ChromaStudio
  node universal-article-generator.js review "Flux 2.0 Pro" "AI image generator" "https://www.chromastudio.ai/"
  
  # MaxStudio  
  node universal-article-generator.js review "Midjourney v6" "AI art generator" "https://www.maxstudio.ai/"
  
  # Any Platform
  node universal-article-generator.js guide "Create AI Videos" "video tutorial" "https://www.yourplatform.com/"

Blog Types: review, guide, comparison, prompt, use-case, api, trend, troubleshooting, tool

✨ Features:
• Automatic sitemap fetching for any platform
• 15-30 strategic internal links with natural anchor text  
• Platform-specific brand voice and CTAs
• SEO optimization with real-time analysis
• Production-ready content requiring no manual editing

🎯 Perfect for agencies managing multiple AI platforms!
        `);
        process.exit(1);
    }

    const [blogType, topic, keyword, platformUrl] = args;
    const generator = new UniversalBlogContentAgent();
    
    (async () => {
        try {
            console.log('🌍 Universal Blog Content Agent Starting...\n');
            
            const result = await generator.generateUniversalArticle({
                blogType,
                topic,
                keyword,
                platformUrl,
                targetAudience: 'creators',
                contentLength: 'medium',
                ctaFocus: 'trial'
            });
            
            console.log(`\n🎉 Article Generated for ${result.platform.name}!\n`);
            console.log('=== GENERATED ARTICLE ===\n');
            console.log(result.content);
            
            console.log('\n=== PLATFORM DETAILS ===\n');
            console.log(`Platform: ${result.platform.name}`);
            console.log(`Domain: ${result.platform.domain}`);
            console.log(`Category: ${result.platform.category}`);
            console.log(`Base URL: ${result.platform.baseUrl}`);
            
            console.log('\n=== METADATA ===\n');
            console.log(JSON.stringify(result.metadata, null, 2));
            
            console.log('\n=== INTERNAL LINKS ADDED ===\n');
            result.internalLinks.forEach((link, index) => {
                console.log(`${index + 1}. ${link.anchorText} → ${link.url} (${link.type})`);
            });
            
            console.log('\n=== SEO ANALYSIS ===\n');
            console.log(JSON.stringify(result.seoAnalysis, null, 2));
            
            console.log(`\n✅ Universal article generation complete for ${result.platform.name}!`);
            console.log(`📊 Generated ${result.content.split(' ').length} words with ${result.internalLinks.length} strategic internal links`);
            
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
            console.error('❌ Error generating universal article:', error.message);
            if (error.stack) {
                console.error('Stack trace:', error.stack);
            }
            process.exit(1);
        }
    })();
}

module.exports = UniversalBlogContentAgent;
